import { CryptoExchangesConsts } from '../../consts/cryptoExchangesConsts';
import { Balance, Trade } from '../domain';

export abstract class CryptoExchange {
  /**
   * コンストラクタ
   *
   * @param _name 仮想通貨取引所名
   * @param _api_key API KEY
   * @param _api_secret API SECRET
   */
  constructor(
    private _name: CryptoExchangesConsts.Name,
    private _api_key: string,
    private _api_secret: string
  ) {}

  get name(): CryptoExchangesConsts.Name {
    return this._name;
  }

  /**
   * 取引所APIを用いて Balance を取得する。
   */
  abstract fetchBalances(): Balance;

  /**
   * 取引所APIを用いて 通貨ペアの現在価格 を取得する。
   */
  abstract fetchNowSymbolPrice(symbol: string): number;

  /**
   * 指定ペアの取引履歴(売買両方)を取得
   */
  abstract fetchSymbolTrades(symbol: string): Trade[];
}
