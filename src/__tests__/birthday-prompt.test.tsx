import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import PresentsScreen from "@/app/(app)/presents";
import { DEMO_USER_ID } from "@/lib/fake-db";
import { renderScreen } from "./test-utils";

const profile = (extra: Record<string, unknown> = {}) => () =>
  AsyncStorage.setItem(
    "fp.demo.profiles",
    JSON.stringify([{ id: DEMO_USER_ID, birth_month: null, birth_day: null, birth_year: null, share_birth_year: false, dismissed_prompts: [], ...extra }]),
  );

describe("Birthday prompt in Presents", () => {
  test("asks on People; saving thanks you and hides the card", async () => {
    await renderScreen(<PresentsScreen />, profile());
    expect(await screen.findByText("When’s your birthday?")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Your birthday"), "27.03");
    await fireEvent.press(screen.getByText("Save"));
    expect(await screen.findByText(/Saved — 27 Mar/)).toBeTruthy();
    expect(screen.queryByText("When’s your birthday?")).toBeNull();
  });

  test("Not now hides it and it stays hidden", async () => {
    await renderScreen(<PresentsScreen />, profile());
    await fireEvent.press(await screen.findByText("Not now"));
    await waitFor(() => expect(screen.queryByText("When’s your birthday?")).toBeNull());
    const saved = JSON.parse((await AsyncStorage.getItem("fp.demo.profiles"))!);
    expect(saved[0].dismissed_prompts).toEqual(["presents"]);
  });

  test("an impossible date is flagged", async () => {
    await renderScreen(<PresentsScreen />, profile());
    await fireEvent.changeText(await screen.findByLabelText("Your birthday"), "31.02");
    expect(screen.getByText(/That date doesn’t exist/)).toBeTruthy();
  });

  test("not shown when you already have a birthday, or closed it before", async () => {
    await renderScreen(<PresentsScreen />, profile({ birth_month: 3, birth_day: 27 }));
    await waitFor(() => expect(screen.getByPlaceholderText("Name…")).toBeTruthy());
    expect(screen.queryByText("When’s your birthday?")).toBeNull();

    await renderScreen(<PresentsScreen />, profile({ dismissed_prompts: ["presents"] }));
    await waitFor(() => expect(screen.getByPlaceholderText("Name…")).toBeTruthy());
    expect(screen.queryByText("When’s your birthday?")).toBeNull();
  });

  test("wishlist asks again only once you've added something", async () => {
    await renderScreen(<PresentsScreen />, profile({ dismissed_prompts: ["presents"] }));
    await fireEvent.press(screen.getByText("My wishlist"));
    expect(screen.queryByText("Add your birthday")).toBeNull();
    const input = screen.getByPlaceholderText("Something you'd like, or a link…");
    await fireEvent.changeText(input, "Headphones");
    await fireEvent(input, "submitEditing");
    expect(await screen.findByText("Add your birthday")).toBeTruthy();
  });
});
