import { expect, it, vi } from "vitest";
import { manageMapStyle } from "./mapStyleLifecycle";
import type { AMapInstance } from "./amap";

function setup() {
  let complete = () => {};
  const map = {
    on: vi.fn((_event, callback) => (complete = callback)),
    setMapStyle: vi.fn(),
    destroy: vi.fn(),
  };
  const lifecycle = manageMapStyle(map as unknown as AMapInstance);
  return { map, lifecycle, complete: () => complete() };
}

it("waits for the style callback to finish before destroying a detached map", async () => {
  const { map, lifecycle, complete } = setup();
  lifecycle.update("dark");
  lifecycle.dispose();
  lifecycle.dispose();
  expect(map.destroy).not.toHaveBeenCalled();
  complete();
  expect(map.destroy).not.toHaveBeenCalled();
  await Promise.resolve();
  expect(map.destroy).toHaveBeenCalledTimes(1);
  lifecycle.update("normal");
  expect(map.setMapStyle).toHaveBeenCalledTimes(1);
});

it("serializes theme requests and destroys immediately once settled", async () => {
  const { map, lifecycle, complete } = setup();
  lifecycle.update("dark");
  lifecycle.update("normal");
  expect(map.setMapStyle).toHaveBeenCalledTimes(1);
  complete();
  await Promise.resolve();
  expect(map.setMapStyle).toHaveBeenLastCalledWith("normal");
  complete();
  await Promise.resolve();
  lifecycle.update("normal");
  expect(map.setMapStyle).toHaveBeenCalledTimes(2);
  lifecycle.dispose();
  expect(map.destroy).toHaveBeenCalledTimes(1);
});
