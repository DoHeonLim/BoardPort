import { describe, expect, it } from "vitest";
import { moveAvatarCrop } from "./avatarCrop";
const center = { zoom: 1, offsetXPercent: 0, offsetYPercent: 0 };
describe("아바타 드래그 좌표", () => {
  it("가로 사진은 여유가 있는 가로축만 이동", () => {
    expect(moveAvatarCrop(640, 320, center, 80, 80, 320)).toEqual({
      ...center,
      offsetXPercent: 50,
    });
  });
  it("작은 화면도 같은 상대 위치로 저장", () => {
    expect(moveAvatarCrop(640, 320, center, 40, 0, 160)).toEqual(
      moveAvatarCrop(640, 320, center, 80, 0, 320)
    );
  });
  it("확대한 정사각형의 양축 경계 제한", () => {
    expect(
      moveAvatarCrop(320, 320, { ...center, zoom: 2 }, 999, -999, 320)
    ).toEqual({ zoom: 2, offsetXPercent: 100, offsetYPercent: -100 });
  });
});
