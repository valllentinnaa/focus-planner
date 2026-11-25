import { validSupabaseConfig } from "./env";

describe("validSupabaseConfig", () => {
  it("accepts an https URL with a key", () => {
    expect(validSupabaseConfig("https://abc.supabase.co", "sb_publishable_1234567890")).toBe(true);
  });
  it("rejects missing or broken values (→ demo mode)", () => {
    expect(validSupabaseConfig("", "sb_publishable_1234567890")).toBe(false);
    expect(validSupabaseConfig("not a url", "sb_publishable_1234567890")).toBe(false);
    expect(validSupabaseConfig("ftp://abc.supabase.co", "sb_publishable_1234567890")).toBe(false);
    expect(validSupabaseConfig("https://abc.supabase.co", "short")).toBe(false);
  });
});
