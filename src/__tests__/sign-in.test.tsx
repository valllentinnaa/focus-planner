import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import SignIn from "@/app/sign-in";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { signUp: jest.fn(), signInWithPassword: jest.fn() } },
}));
jest.mock("@/components/welcome-intro", () => ({ WelcomeIntro: () => null }));

const auth = supabase.auth as unknown as { signUp: jest.Mock; signInWithPassword: jest.Mock };

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), email);
  await fireEvent.changeText(screen.getByPlaceholderText("Password (8+ characters)"), password);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  auth.signUp.mockReset();
  auth.signInWithPassword.mockReset();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ invite: "1" });
});

describe("Sign in / create account", () => {
  test("from an invite on a new device: goes straight to Create account", async () => {
    await render(<SignIn />);
    expect(screen.getByText(/You were invited/)).toBeTruthy();
    expect(screen.getAllByText("Create account").length).toBeGreaterThan(0);
  });

  test("from an invite on a device used before: Sign in, email filled in", async () => {
    await AsyncStorage.setItem("fp.lastEmail", "ana@example.com");
    await render(<SignIn />);
    expect(await screen.findByDisplayValue("ana@example.com")).toBeTruthy();
    expect(screen.getAllByText("Sign in").length).toBeGreaterThan(0);
  });

  test("create account with an existing email + right password signs in", async () => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "user_already_exists", message: "User already registered" } });
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    await render(<SignIn />);
    await fill("ana@example.com", "correct-horse");
    await fireEvent.press(screen.getAllByText("Create account").at(-1)!);
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "ana@example.com", password: "correct-horse" }));
    expect(screen.queryByText(/that password isn’t right/)).toBeNull();
  });

  test("existing email + wrong password: switches to Sign in and says so", async () => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "user_already_exists", message: "User already registered" } });
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });
    await render(<SignIn />);
    await fill("ana@example.com", "wrong-password");
    await fireEvent.press(screen.getAllByText("Create account").at(-1)!);
    expect(await screen.findByText(/already have an account with this email, but that password isn’t right/)).toBeTruthy();
  });

  test("new email creates the account and does not try to sign in", async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "u1", identities: [{}] }, session: {} }, error: null });
    await render(<SignIn />);
    await fill("new@example.com", "long-enough");
    await fireEvent.press(screen.getAllByText("Create account").at(-1)!);
    await waitFor(() => expect(auth.signUp).toHaveBeenCalled());
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});
