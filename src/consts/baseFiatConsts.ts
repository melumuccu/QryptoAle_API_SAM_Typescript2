/**
 * 基軸通貨関連
 */
export namespace BaseFiatConsts {
  // 基軸通貨名
  export const name = {
    USDT: 'USDT',
    BUSD: 'BUSD',
  } as const;
  export type Name = typeof name[keyof typeof name];
}
