// src/api/api.hidden.ts
import { ApiUpdateVisibilityParam, HiddenState } from "../types/Types";
import api from "../config/api.config";

/**
 * Ẩn / hiện Virtual Account cho user hiện tại
 * BE: PATCH /api/hidden/virtual-accounts/{id}
 */
async function updateVirtualAccountVisibility(
  virtualAccountId: number,
  body: ApiUpdateVisibilityParam
): Promise<void> {
  await api.patch(`/api/hidden/virtual-accounts/${virtualAccountId}`, body);
}

/**
 * Ẩn / hiện Card Group cho user hiện tại
 * BE: PATCH /api/hidden/card-groups/{id}
 */
async function updateCardGroupVisibility(
  cardGroupId: number,
  body: ApiUpdateVisibilityParam
): Promise<void> {
  await api.patch(`/api/hidden/card-groups/${cardGroupId}`, body);
}

/**
 * (OPTIONAL) Lấy state ẩn hiện của user hiện tại
 * Nếu anh thêm endpoint:
 *   GET /api/hidden/state -> HiddenState
 */
async function getHiddenState(): Promise<HiddenState> {
  const res = await api.get<HiddenState>("/api/hidden/state");
  return res.data;
}

export const hiddenApi = {
  updateVirtualAccountVisibility,
  updateCardGroupVisibility,
  getHiddenState, // nếu chưa có endpoint có thể bỏ
};
