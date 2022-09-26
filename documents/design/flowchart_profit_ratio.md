# 現状

- 仮想通貨取引所は Binance のみ

## フローチャート

### profit-ratio

```mermaid
flowchart TB
  subgraph binanceUtil_fetchBalances
    1-1[通貨リストの取得 -> asset, free, locked が得られる -> balance とする]
    1-2[baseFiat換算で最小金額を下回る通貨を省く]

    1-return[return balance の通貨リスト]
  end

  binanceUtil_fetchBalances ==> binanceUtil_calAvePriceByBalance

  subgraph binanceUtil_calAvePriceByBalance
    2-1[各通貨の購入履歴から平均価格を算出]

    2-return[return balance, aveBuyPrice のリスト]
  end

  binanceUtil_calAvePriceByBalance ==> binanceUtil_calProfitRatio

  subgraph binanceUtil_calProfitRatio
    3-1[対baseFiatの現在価格を取得 注:1-2と処理被り]
    3-2[利益率を算出]

    3-return[return balance, aveBuyPrice, nowSymbolPrice, profitRatio のリスト]
  end
```

### portfolio

```mermaid
flowchart TB
  subgraph binanceUtil_fetchBalances
    1-1[通貨リストの取得 -> asset, free, locked が得られる -> balance とする]

    1-return[return balance の通貨リスト]
  end

  binanceUtil_fetchBalances ==> binanceUtil_fetchPortfolio

  subgraph binanceUtil_fetchPortfolio
    2-1[ドル円のレートを取得]
    2-2[各通貨の合計保有数量を計算:free + locked]
    2-3[各通貨の対baseFiatの現在価格を取得]
    2-4[各通貨をbaseFiat換算]
    2-5[各通貨を日本円換算]

    2-return[return balance, convertedToBaseFiat, convertedToJpy のリスト]
  end
```

---

# 改修後

- 仮想通貨取引所は Binance 以外も含む

  - Bitbank, coincheck, ...
  - どの仮想通貨取引所でもやることは同じなので抽象化を試みる

- BaseFiat はフロントからのパラメータとしたい

  - アプリ側から自由に選択できるようにするため

- 基本的には既存の処理はそのまま残し、新たなファイルを作り直す

  - 大幅変更のため、型定義などがごちゃまぜになることを防ぎたい

## response

### profit-ratio

```
[
  {
    crypto_exchange: string(ex. "Binance"),
    crypto: [
      'BTC': {
        balance: AssetBalance;
        aveBuyPrice: number;
        nowSymbolPrice: number;
        profitRatio: number;
      },
      'ETH': {
        balance: AssetBalance;
        aveBuyPrice: number;
        nowSymbolPrice: number;
        profitRatio: number;
      },
      ︙
    ]
  },
  {
    crypto_exchange: string(ex. "Bitbank"),
    crypto: [
      'BTC': {
        balance: AssetBalance;
        aveBuyPrice: number;
        nowSymbolPrice: number;
        profitRatio: number;
      },
      'ETH': {
        balance: AssetBalance;
        aveBuyPrice: number;
        nowSymbolPrice: number;
        profitRatio: number;
      },
      ︙
    ]
  },
  ︙
]
```

### portfolio

```
[
  {
    crypto_exchange: string(ex. "Binance"),
    crypto: [
      'BTC': {
        balance: AssetBalance;
        convertedToBaseFiat: number;
        convertedToJpy: number;
      },
      'ETH': {
        balance: AssetBalance;
        convertedToBaseFiat: number;
        convertedToJpy: number;
      },
      ︙
    ]
  },
  {
    crypto_exchange: string(ex. "Bitbank"),
    crypto: [
      'BTC': {
        balance: AssetBalance;
        convertedToBaseFiat: number;
        convertedToJpy: number;
      },
      'ETH': {
        balance: AssetBalance;
        convertedToBaseFiat: number;
        convertedToJpy: number;
      },
      ︙
    ]
  },
  ︙
]
```

## フローチャート

- 取引所のリスト
  - ログイン機能実装後はユーザ情報に紐づく取引所を DB から取得して作成する想定
  - 今はとりあえず固定で、API_KEY が設定されている取引所のリストを用いる

### profit-ratio

```mermaid
flowchart TB
  3-1[対象となる取引所のリストを取得]
  3-1 ==> LOOP:取引所リスト
  subgraph LOOP:取引所リスト
    1[取引所クラスをnew]
    2[通貨リストを取得 -> asset, free, locked が得られる -> balance とする]
    subgraph LOOP:通貨リスト
      2-1[各通貨の対baseFiatの現在価格を取得]
      2-2[baseFiat換算で最小金額を下回る通貨を省く]
      2-3[各通貨の購入履歴から平均価格を算出]
      2-4[利益率を算出]
      2-1 --> 2-2 --> 2-3 --> 2-4
    end
  end
  LOOP:取引所リスト ==> 4-1
  4-1[return response]
```

### portfolio

```mermaid
flowchart TB
  3-1[対象となる取引所のリストを取得]
  3-1 ==> LOOP:取引所リスト
  subgraph LOOP:取引所リスト
    1[取引所クラスをnew]
    2[通貨リストを取得 -> asset, free, locked が得られる -> balance とする]
    subgraph LOOP:通貨リスト
      2-1[ドル円のレートを取得]
      2-2[各通貨の合計保有数量を計算:free + locked]
      2-3[各通貨の対baseFiatの現在価格を取得]
      2-4[各通貨をbaseFiat換算]
      2-5[各通貨を日本円換算]

      2-1 --> 2-2 --> 2-3 --> 2-4 --> 2-5
    end
  end
  LOOP:取引所リスト ==> 4-1
  4-1[return response]
```

## クラス設計

```mermaid
classDiagram
  direction LR

  class CryptoExchange{
    <<Abstract>>
    -string name
    +getName() string
    +fetchBalances() Balance
    +fetchNowSymbolPrice(string symbol) Object
  }

  class Binance
  class Coincheck
  class Bitbank

  Binance ..> CryptoExchange
  Coincheck ..> CryptoExchange
  Bitbank ..> CryptoExchange

  class CryptoExchanges{
    <<enumeration>>
    BINANCE
    COINCHECK
    BITBANK
  }
```
