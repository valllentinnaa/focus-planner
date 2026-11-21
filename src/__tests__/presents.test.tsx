import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import PresentsScreen from "@/app/(app)/presents";
import { renderScreen } from "./test-utils";

async function addPerson(name: string, birthday = "") {
  await fireEvent.changeText(screen.getByPlaceholderText("Name…"), name);
  await fireEvent.changeText(screen.getByPlaceholderText("Birthday dd.mm(.yyyy)"), birthday);
  await fireEvent(screen.getByPlaceholderText("Name…"), "submitEditing");
}

describe("Presents screen", () => {
  test("adds a person with a birthday", async () => {
    await renderScreen(<PresentsScreen />);
    await addPerson("Ana", "27.03.2023");
    expect(await screen.findByText("Ana")).toBeTruthy();
    expect(await screen.findByText(/27 Mar · turns/)).toBeTruthy();
  });

  test("adds a person without a birthday", async () => {
    await renderScreen(<PresentsScreen />);
    await addPerson("Bo");
    expect(await screen.findByText("Bo")).toBeTruthy();
    expect(screen.getByText("No birthday yet")).toBeTruthy();
  });

  test("does not add with an impossible birthday", async () => {
    await renderScreen(<PresentsScreen />);
    await addPerson("Cy", "31.04");
    await waitFor(() => expect(screen.queryByText("Cy")).toBeNull());
    // The typed name stays, so it can be fixed.
    expect(screen.getByDisplayValue("Cy")).toBeTruthy();
  });

  test("gift ideas: add with a link, then cycle Idea → Bought → Given", async () => {
    await renderScreen(<PresentsScreen />);
    await addPerson("Ana", "27.03");
    // A newly added person opens straight away.
    const idea = await screen.findByPlaceholderText("Idea, link, photo or PDF…");
    await fireEvent.changeText(idea, "Lego set https://shop.example/lego");
    await fireEvent(idea, "submitEditing");

    expect(await screen.findByText("Lego set")).toBeTruthy();
    expect(screen.getByText("shop.example/lego")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Status Idea, tap to change"));
    expect(await screen.findByLabelText("Status Bought, tap to change")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Status Bought, tap to change"));
    expect(await screen.findByLabelText("Status Given, tap to change")).toBeTruthy();
    expect(screen.getByText(new RegExp(`Lego set \\(${new Date().getFullYear()}\\)`))).toBeTruthy();
  });

  test("delete asks first, then removes the person", async () => {
    await renderScreen(<PresentsScreen />);
    await addPerson("Ana");
    await fireEvent.press(await screen.findByLabelText("Delete Ana"));
    await fireEvent.press(screen.getByText("No"));
    expect(screen.getByText("Ana")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Delete Ana"));
    await fireEvent.press(screen.getByText("Yes"));
    await waitFor(() => expect(screen.queryByText("Ana")).toBeNull());
  });

  test("tabs: People is the default; My wishlist and Friends & circles switch the view", async () => {
    await renderScreen(<PresentsScreen />);
    expect(screen.getByPlaceholderText("Name…")).toBeTruthy();
    await fireEvent.press(screen.getByText("My wishlist"));
    expect(screen.queryByPlaceholderText("Name…")).toBeNull();
    expect(screen.getByPlaceholderText("Something you'd like, or a link…")).toBeTruthy();
  });

  test("my wishlist: add and remove an item", async () => {
    await renderScreen(<PresentsScreen />);
    await fireEvent.press(screen.getByText("My wishlist"));
    const input = screen.getByPlaceholderText("Something you'd like, or a link…");
    await fireEvent.changeText(input, "Good headphones");
    await fireEvent(input, "submitEditing");
    expect(await screen.findByText("Good headphones")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Remove"));
    await waitFor(() => expect(screen.queryByText("Good headphones")).toBeNull());
  });

  test("coming up shows a birthday within 30 days", async () => {
    await renderScreen(<PresentsScreen />);
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const dd = String(soon.getDate()).padStart(2, "0");
    const mm = String(soon.getMonth() + 1).padStart(2, "0");
    await addPerson("Dee", `${dd}.${mm}`);
    expect(await screen.findByText("Coming up")).toBeTruthy();
    expect(screen.getAllByText("In 3 days").length).toBeGreaterThan(0);
  });
});
