import { fireEvent, screen } from "@testing-library/react-native";
import { TogetherPanel } from "@/components/checkin/together";
import { useMatesCheckins, useMeetups } from "@/data/checkins";
import { useMates } from "@/data/connections";
import { renderScreen } from "./test-utils";

jest.mock("@/data/checkins", () => ({
  togetherAvailable: true,
  useMatesCheckins: jest.fn(),
  useMeetups: jest.fn(),
  useVoiceUrls: () => ({}),
}));
jest.mock("@/data/connections", () => ({ useMates: jest.fn() }));
jest.mock("@/data/circles", () => ({ useCircles: () => ({ circles: [{ id: "c1", name: "Book club" }] }) }));

const cheer = jest.fn();
const rsvp = jest.fn();
const create = jest.fn().mockResolvedValue(undefined);
const meetup = {
  id: "m1", host: "Ana", is_host: false, circle: "Book club", starts_at: new Date(2030, 0, 5, 19).toISOString(),
  place: "Café Rila", link: null, going: ["Ana"], me_going: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  (useMates as jest.Mock).mockReturnValue([{ user_id: "a", name: "Ana" }, { user_id: "b", name: "Bo" }]);
  (useMeetups as jest.Mock).mockReturnValue({ meetups: [meetup], loading: false, create, creating: false, rsvp, cancel: jest.fn() });
  (useMatesCheckins as jest.Mock).mockReturnValue({
    loading: false,
    cheer,
    checkins: [{
      id: "k1", user_id: "a", name: "Ana", went_well: "Ran 10k", felt_heavy: null, try_next: null,
      went_well_audio: null, felt_heavy_audio: null, try_next_audio: null, cheers: 2, cheered: false,
    }],
  });
});

describe("Check-in together", () => {
  test("shows who else checks in, meetups and shared cards — only shared answers", async () => {
    await renderScreen(<TogetherPanel month="2026-11-01" />);
    expect(screen.getByText(/Ana and 1 other check in around now too/)).toBeTruthy();
    expect(screen.getByText(/Café Rila · Book club · Ana is hosting/)).toBeTruthy();
    expect(screen.getByText("Ran 10k")).toBeTruthy();
    expect(screen.queryByText("What felt heavy?")).toBeNull();

    await fireEvent.press(screen.getByText("I’m in"));
    expect(rsvp).toHaveBeenCalledWith("m1");
    await fireEvent.press(screen.getByLabelText("Cheer Ana"));
    expect(cheer).toHaveBeenCalledWith("k1");
  });

  test("planning a meetup for a circle", async () => {
    await renderScreen(<TogetherPanel month="2026-11-01" />);
    await fireEvent.press(screen.getByText("🥂  Do it together"));
    await fireEvent.press(screen.getByText("Book club"));
    await fireEvent.changeText(screen.getByPlaceholderText("Our café, the park, my place…"), "Park");
    await fireEvent.press(screen.getByText("Save & invite"));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ circleId: "c1", place: "Park", link: null }));
  });

  test("nobody yet: a gentle invite instead", async () => {
    (useMates as jest.Mock).mockReturnValue([]);
    await renderScreen(<TogetherPanel month="2026-11-01" />);
    expect(screen.getByText(/Check-ins are nicer with a friend/)).toBeTruthy();
  });
});
