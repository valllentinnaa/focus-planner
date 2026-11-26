import { withFriendBirthday } from "./my-birthday";

const mates = new Map([["u1", { month: 3, day: 27, year: null }]]);
const base = { birth_month: null, birth_day: null, birth_year: null };

describe("withFriendBirthday", () => {
  test("a linked person without a birthday gets the friend's", () => {
    const p = withFriendBirthday({ ...base, linked_user_id: "u1" }, mates);
    expect([p.birth_month, p.birth_day, p.birthdayFromFriend]).toEqual([3, 27, true]);
  });
  test("what you typed wins", () => {
    const p = withFriendBirthday({ birth_month: 1, birth_day: 2, birth_year: null, linked_user_id: "u1" }, mates);
    expect([p.birth_month, p.birthdayFromFriend]).toEqual([1, false]);
  });
  test("not linked, or friend has none → unchanged", () => {
    expect(withFriendBirthday({ ...base, linked_user_id: null }, mates).birth_month).toBeNull();
    expect(withFriendBirthday({ ...base, linked_user_id: "u2" }, mates).birth_month).toBeNull();
  });
});
