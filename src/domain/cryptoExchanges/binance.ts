import Binance from 'binance-api-node';
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
    const balance: Balance = {
      free: '0',
      locked: '0',
    };
    return await { sample: balance };
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
