// import api from "../config/api.config";
// import {
//   TransactionListResponse,
//   TransactionSearchParams,
// } from "../types/Types";


// export const transactionApi = {
//   async search(
//     params: TransactionSearchParams
//   ): Promise<TransactionListResponse> {
//     const res = await api.get("/api/transactions/search", {
//       params: {
//         accountId: params.accountId,
//         virtualAccountId: params.virtualAccountId,
//         cardId: params.cardId,
//         status: params.status,
//         dateFrom: params.dateFrom,
//         dateTo: params.dateTo,
//         minAmountCents: params.minAmountCents,
//         maxAmountCents: params.maxAmountCents,
//         merchant: params.merchant,
//         cursor: params.cursor,
//         size: params.size,
//       },
//     });
//     return res.data;
//   },
// };
