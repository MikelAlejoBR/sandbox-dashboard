import { readyUserFixture } from "../../mocks/fixtures";
import type { User } from "../../types";
import { isRhdhReady, RHDH_READY_DELAY_MS } from "../rhdh-utils";

const startDate = "2026-01-01T00:00:00.000Z";
const startMs = new Date(startDate).getTime();

function userWithStartDate(value: string): User {
  return {
    ...readyUserFixture,
    startDate: value,
  };
}

describe("rhdh-utils", () => {
  describe("isRhdhReady", () => {
    it("returns false if the user is undefined", () => {
      expect(isRhdhReady(undefined)).toBe(false);
    });

    it("returns false if the user's start date is undefined", () => {
      expect(
        isRhdhReady({
          ...readyUserFixture,
          startDate: undefined,
        }),
      ).toBe(false);
    });

    it("returns false if the user's start date is empty", () => {
      expect(isRhdhReady(userWithStartDate(""))).toBe(false);
    });

    it("returns false if the user's start date is not a valid date", () => {
      expect(
        isRhdhReady(userWithStartDate("not-a-date"), startMs + 16_000),
      ).toBe(false);
    });

    it("returns false when not enough time has elapsed for RHDH to be ready", () => {
      expect(
        isRhdhReady(
          userWithStartDate(startDate),
          startMs + RHDH_READY_DELAY_MS - 1_000,
        ),
      ).toBe(false);
    });

    it("returns false when exactly 15 seconds have elapsed", () => {
      expect(
        isRhdhReady(
          userWithStartDate(startDate),
          startMs + RHDH_READY_DELAY_MS,
        ),
      ).toBe(false);
    });

    it("returns true when enough time has passed for RHDH to be ready", () => {
      expect(
        isRhdhReady(
          userWithStartDate(startDate),
          startMs + RHDH_READY_DELAY_MS + 1_000,
        ),
      ).toBe(true);
    });

    it("returns false when startDate is in the future", () => {
      expect(
        isRhdhReady(
          userWithStartDate(startDate),
          startMs - (RHDH_READY_DELAY_MS + 1_000),
        ),
      ).toBe(false);
    });
  });
});
