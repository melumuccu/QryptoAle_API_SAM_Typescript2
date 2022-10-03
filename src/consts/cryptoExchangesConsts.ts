/**
 * 仮想通貨取引所関連
 */
export namespace CryptoExchangesConsts {
  // 取引所名
  export const name = {
    BINANCE: 'BINANCE',
    COINCHECK: 'Coincheck',
    BITBANK: 'bitbank',
    BITFLYER: 'bitFlyer',
  } as const;
  export type Name = typeof name[keyof typeof name];
}
