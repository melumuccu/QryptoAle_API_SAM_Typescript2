/**
 * 仮想通貨取引所関連
 */
export namespace CryptoExchangesConsts {
  // 取引所名
  export const name = {
    binance: 'BINANCE',
    coincheck: 'COINCHECK',
    bitbank: 'BITBANK',
    bitflyer: 'BITFLYER',
  } as const;
  export type Name = typeof name[keyof typeof name];
}
