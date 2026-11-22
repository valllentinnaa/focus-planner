import { fireEvent, screen } from "@testing-library/react-native";
import { TogetherStep } from "@/components/checkin/together";
import { useMeetups } from "@/data/checkins";
import { useMates } from "@/data/connections";
import { renderScreen } from "./test-utils";

jest.mock("@/data/checkins", () => ({ togetherAvailable: true, useMeetups: jest.fn() }));
jest.mock("@/data/connections", () => ({ useMates: jest.fn() }));
jest.mock("@/data/circles", () => ({ useCircles: () => ({ circles: [{ id: "c1", name: "Book club" }] }) }));

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
});

describe("Check in together (before the month card)", () => {
  test("offers your people's meetups, or going solo", async () => {
    const onSolo = jest.fn();
    await renderScreen(<TogetherStep monthName="November" onSolo={onSolo} />);
    expect(screen.getByText(/Ana and 1 other check in around now too/)).toBeTruthy();
    expect(screen.getByText(/Café Rila · Book club · Ana is hosting/)).toBeTruthy();
    await fireEvent.press(screen.getByText("I’m in"));
    expect(rsvp).toHaveBeenCalledWith("m1");
    await fireEvent.press(screen.getByText("Just me, now →"));
    expect(onSolo).toHaveBeenCalled();
  });

  test("planning a meetup for a circle", async () => {
    await renderScreen(<TogetherStep monthName="November" onSolo={jest.fn()} />);
    await fireEvent.press(screen.getByText("🥂  Do it together"));
    await fireEvent.press(screen.getByText("Book club"));
    await fireEvent.changeText(screen.getByPlaceholderText("Our café, the park, my place…"), "Park");
    await fireEvent.press(screen.getByText("Save & invite"));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ circleId: "c1", place: "Park", link: null }));
  });
});
