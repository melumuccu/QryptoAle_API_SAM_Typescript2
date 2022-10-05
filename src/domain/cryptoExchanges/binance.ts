import Binance, { AssetBalance } from 'binance-api-node';
import { CryptoExchangesConsts } from '../../consts/cryptoExchangesConsts';
import { CryptoExchange } from '../abstract/cryptoExchange';
import { Balance, Trade } from '../domain';

export class MyBinance extends CryptoExchange {
  sdk: import('binance-api-node').Binance;

  /** コンストラクタ */
  constructor(
    private _binanceName: CryptoExchangesConsts.Name,
    private _binanceApiKey: string,
    private _binanceApiSecret: string
  ) {
    super(_binanceName, _binanceApiKey, _binanceApiSecret);
    this.sdk = Binance({
      apiKey: _binanceApiKey,
      apiSecret: _binanceApiSecret,
    });
  }

  /**
   * 取引所APIを用いて Balance を取得する。
   */
  async fetchBalances(): Promise<{ [asset: string]: Balance }> {
    type MyAssetBalance = { [asset: string]: Balance };

    const balances: AssetBalance[] = (await this.sdk.accountInfo()).balances;

    /** 規定の型に加工 */
    const processingPrescribedType = (currentB: AssetBalance): MyAssetBalance => {
      return {
        [currentB.asset]: {
          free: currentB.free,
          locked: currentB.locked,
        },
      };
    };

    /** 配列をオブジェクトに加工 */
    const processingToObject = (currentB: MyAssetBalance, previousB: MyAssetBalance) => {
      return Object.assign(previousB, currentB);
    };

    return balances.map(processingPrescribedType).reduce(processingToObject);
  }

  /**
   * 取引所APIを用いて 通貨ペアの現在価格 を取得する。
   */
  fetchNowSymbolPrice(symbol: string): number {
    return 0;
  }

  /**
   * 指定ペアの取引履歴(売買両方)を取得
   */
  fetchSymbolTrades(symbol: string): Trade[] {
    return [
      {
        symbol: '',
        price: '',
        qty: '',
        commission: '',
        commissionAsset: '',
        time: 0,
        isBuy: true,
      },
    ];
  }
}
