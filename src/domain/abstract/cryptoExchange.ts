import { CryptoExchangesConsts } from '../../consts/cryptoExchangesConsts';
import { Balance, Trade } from '../domain';

export abstract class CryptoExchange {
  /**
   * コンストラクタ
   *
   * @param _name 仮想通貨取引所名
   * @param _apiKey API KEY
   * @param _apiSecret API SECRET
   */
  constructor(
    private _name: CryptoExchangesConsts.Name,
    private _apiKey: string,
    private _apiSecret: string
  ) {}

  get name(): CryptoExchangesConsts.Name {
    return this._name;
  }

  /**
   * 取引所APIを用いて Balance を取得する。
   */
  abstract fetchBalances(): Promise<{ [asset: string]: Balance }>;

  /**
   * 取引所APIを用いて 通貨ペアの現在価格 を取得する。
   */
  abstract fetchNowSymbolPrice(symbol: string): Promise<number>;

  /**
   * 指定ペアの取引履歴を取得
   *
   * @param symbol 指定ペア
   * @param isBuy true: 購入, false: 売却
   */
  abstract fetchSymbolTrades(symbol: string, isBuy: boolean): Promise<Trade[]>;
}
