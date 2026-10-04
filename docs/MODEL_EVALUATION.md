# Model Evaluation Report

| Model                   |   MAE |   RMSE |   WAPE |   Train Time (s) |
|:------------------------|------:|-------:|-------:|-----------------:|
| Naive (Lag 7)           | 10.63 |  13.94 |  83.19 |             0    |
| Moving Average (Roll 7) |  8.5  |  11.14 |  66.52 |             0    |
| Ridge                   |  7.48 |   9.82 |  58.5  |             0.01 |
| Random Forest           |  8.03 |  10.44 |  62.81 |            19.02 |
| LightGBM                |  7.32 |   9.65 |  57.28 |             0.2  |