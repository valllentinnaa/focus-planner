import { fireEvent, screen } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import SharedWishlistPage from "@/app/w/[token]";
import { useSharedWishlist } from "@/data/wishlist";
import { renderScreen } from "./test-utils";

jest.mock("@/data/wishlist", () => ({ useSharedWishlist: jest.fn() }));

const claim = jest.fn();
const unclaim = jest.fn();
const base = { loading: false, error: null, claim, unclaim, busy: false };
const items = [
  { id: "1", text: "Book", link: null, note: "", claimed: false },
  { id: "2", text: "Scarf", link: "https://shop.example/scarf", note: "blue", claimed: true },
  { id: "3", text: "Mug", link: null, note: "", claimed: true },
];

beforeEach(() => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ token: "0123456789abcdef0123456789abcdef" });
  claim.mockClear();
  unclaim.mockClear();
});

describe("Shared wishlist page", () => {
  test("visitor can claim free items and undo their own; others' claims show as taken", async () => {
    (useSharedWishlist as jest.Mock).mockReturnValue({ ...base, list: { owner: "Ana", is_owner: false, items, mine: new Set(["3"]) } });
    await renderScreen(<SharedWishlistPage />);

    expect(screen.getByText("Ana's wishes")).toBeTruthy();
    await fireEvent.press(screen.getByText("I’m getting this"));
    expect(claim).toHaveBeenCalledWith("1");

    expect(screen.getByText("Someone’s getting this")).toBeTruthy();
    await fireEvent.press(screen.getByText("You’re getting it · undo"));
    expect(unclaim).toHaveBeenCalledWith("3");
  });

  test("owner sees the explanation and no claim buttons", async () => {
    (useSharedWishlist as jest.Mock).mockReturnValue({
      ...base,
      list: { owner: "Ana", is_owner: true, items: items.map((i) => ({ ...i, claimed: false })), mine: new Set() },
    });
    await renderScreen(<SharedWishlistPage />);
    expect(screen.getByText(/Who’s getting what stays hidden from you/)).toBeTruthy();
    expect(screen.queryByText("I’m getting this")).toBeNull();
  });

  test("dead link", async () => {
    (useSharedWishlist as jest.Mock).mockReturnValue({ ...base, list: null });
    await renderScreen(<SharedWishlistPage />);
    expect(screen.getByText("Not found")).toBeTruthy();
    expect(screen.getByText(/doesn’t work anymore/)).toBeTruthy();
  });
});
