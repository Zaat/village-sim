# Insight report: 12 worlds x 320 days (10.0 years)

## By map type

| map | pop | peak | mood | inequality | unity | unrest | trips | outposts |
|---|---|---|---|---|---|---|---|---|
| island | 65 | 100 | 67 | 0.76 | 0.49 | 2.5 | 0.0 | 0.0 |
| archipelago | 122 | 127 | 72 | 0.76 | 0.62 | 0.0 | 0.5 | 2.5 |
| continent | 118 | 127 | 69 | 0.77 | 0.55 | 1.0 | 2.0 | 1.5 |
| peninsula | 63 | 73 | 66 | 0.81 | 0.46 | 4.0 | 1.0 | 1.0 |
| lakeland | 88 | 116 | 70 | 0.76 | 0.56 | 0.0 | 0.0 | 3.0 |
| river | 65 | 98 | 65 | 0.74 | 0.44 | 5.0 | 0.0 | 0.5 |

## By final regime

| regime | worlds | pop | mood | inequality | unrest | feuds | discoveries |
|---|---|---|---|---|---|---|---|
| Theocracy | 1 | 55 | 67 | 0.75 | 4.0 | 5.0 | 9.0 |
| Autocracy | 5 | 94 | 70 | 0.77 | 0.6 | 11.4 | 14.2 |
| Commune | 1 | 139 | 71 | 0.77 | 0.0 | 14.0 | 18.0 |
| Fractured Town | 2 | 70 | 66 | 0.76 | 5.0 | 12.0 | 10.0 |
| Industrial State | 2 | 88 | 69 | 0.77 | 2.0 | 8.0 | 17.5 |
| Founders’ Village | 1 | 63 | 64 | 0.78 | 4.0 | 9.0 | 10.0 |

## Strongest correlations (|r| >= 0.5, n = 12; small samples, treat as hints)

- meanMood vs meanUnity: r = 0.94
- techs vs tradeLate: r = 0.88
- meanUnity vs lateMood: r = 0.87
- deals vs techs: r = 0.87
- meanPious vs outposts: r = -0.86
- discoveries vs tradeLate: r = 0.85
- deals vs discoveries: r = 0.83
- born vs lateMood: r = 0.83
- unrest vs lateMood: r = -0.82
- lateUnrest vs lateMood: r = -0.82
- meanMood vs unrest: r = -0.82
- meanMood vs lateUnrest: r = -0.82
- meanPop vs meanUnity: r = 0.80
- meanUnity vs unrest: r = -0.80
- meanUnity vs lateUnrest: r = -0.80
- meanOpen vs outposts: r = 0.78
- meanPop vs lateMood: r = 0.77
- meanOpen vs deals: r = 0.76
- meanUnity vs born: r = 0.75
- meanAuth vs meanPious: r = 0.74
- meanOpen vs tradeLate: r = 0.74
- meanUnity vs discoveries: r = 0.73
- meanOpen vs discoveries: r = 0.73
- born vs feuds: r = 0.73
- meanUnity vs outposts: r = 0.72

## Specific questions

- Does early inequality predict later unrest? (earlyGini vs lateUnrest): r = -0.29
- Does early unrest predict later unrest? (earlyUnrest vs lateUnrest): not enough variation
- Do rich worlds (early wealth) grow faster later? (earlyWealth vs lateGrowth): r = -0.21
- Does inequality lower mood? (meanGini vs meanMood): r = -0.26
- Does trade go with growth? (tradeLate vs lateGrowth): r = -0.11
- Does openness go with discovery? (meanOpen vs discoveries): r = 0.73
- Does authority go with unrest? (meanAuth vs unrest): r = 0.50
- Does unity go with population? (meanUnity vs meanPop): r = 0.80
- Does crime go with inequality? (meanGini vs crimes): r = -0.39

## Worlds

```json
{"years":10,"pop":55,"peakPop":87,"meanPop":59.2,"meanMood":67.2,"meanGini":0.746,"maxGini":0.845,"meanUnity":0.491,"meanAuth":0.598,"meanOpen":0.508,"meanPious":0.627,"meanIndus":0.448,"meanComm":0.627,"born":137,"died":135,"starved":0,"violence":0,"unrest":4,"coups":0,"secessions":0,"strikes":2,"feuds":5,"crimes":18,"trips":0,"deals":2,"outposts":0,"discoveries":9,"projects":6,"techs":9,"fires":3,"fevers":5,"famines":0,"growthPerYear":4.27,"regime":"Theocracy","map":"island","seed":138,"earlyGini":0.763,"earlyMood":73.4,"earlyWealth":2.4,"lateUnrest":4,"earlyUnrest":0,"lateGrowth":-7.43,"lateMood":62.4,"tradeLate":2,"errors":0}
{"years":10,"pop":74,"peakPop":112,"meanPop":70,"meanMood":67.7,"meanGini":0.769,"maxGini":0.875,"meanUnity":0.491,"meanAuth":0.605,"meanOpen":0.414,"meanPious":0.547,"meanIndus":0.549,"meanComm":0.41,"born":199,"died":169,"starved":9,"violence":0,"unrest":1,"coups":0,"secessions":0,"strikes":0,"feuds":15,"crimes":16,"trips":0,"deals":1,"outposts":0,"discoveries":11,"projects":4,"techs":11,"fires":1,"fevers":8,"famines":3,"growthPerYear":6,"regime":"Autocracy","map":"island","seed":101,"earlyGini":0.835,"earlyMood":71.9,"earlyWealth":1.74,"lateUnrest":1,"earlyUnrest":0,"lateGrowth":-1.14,"lateMood":66.5,"tradeLate":1,"errors":0}
{"years":10,"pop":105,"peakPop":113,"meanPop":77.7,"meanMood":72.7,"meanGini":0.743,"maxGini":0.871,"meanUnity":0.62,"meanAuth":0.474,"meanOpen":0.586,"meanPious":0.437,"meanIndus":0.463,"meanComm":0.571,"born":268,"died":157,"starved":1,"violence":0,"unrest":0,"coups":0,"secessions":0,"strikes":0,"feuds":16,"crimes":20,"trips":0,"deals":4,"outposts":3,"discoveries":13,"projects":3,"techs":12,"fires":3,"fevers":11,"famines":1,"growthPerYear":8.82,"regime":"Autocracy","map":"archipelago","seed":145,"earlyGini":0.803,"earlyMood":74.1,"earlyWealth":1.92,"lateUnrest":0,"earlyUnrest":0,"lateGrowth":4.29,"lateMood":74.2,"tradeLate":4,"errors":0}
{"years":10,"pop":139,"peakPop":141,"meanPop":92.1,"meanMood":71.4,"meanGini":0.773,"maxGini":0.884,"meanUnity":0.62,"meanAuth":0.469,"meanOpen":0.522,"meanPious":0.453,"meanIndus":0.464,"meanComm":0.565,"born":307,"died":168,"starved":1,"violence":0,"unrest":0,"coups":0,"secessions":0,"strikes":0,"feuds":14,"crimes":19,"trips":1,"deals":13,"outposts":2,"discoveries":18,"projects":6,"techs":18,"fires":2,"fevers":6,"famines":1,"growthPerYear":11.91,"regime":"Commune","map":"archipelago","seed":108,"earlyGini":0.84,"earlyMood":71.9,"earlyWealth":2.1,"lateUnrest":0,"earlyUnrest":0,"lateGrowth":9.14,"lateMood":75.6,"tradeLate":14,"errors":0}
{"years":10,"pop":150,"peakPop":150,"meanPop":70.2,"meanMood":68,"meanGini":0.781,"maxGini":0.881,"meanUnity":0.511,"meanAuth":0.659,"meanOpen":0.591,"meanPious":0.575,"meanIndus":0.528,"meanComm":0.526,"born":236,"died":130,"starved":0,"violence":0,"unrest":2,"coups":1,"secessions":0,"strikes":0,"feuds":9,"crimes":20,"trips":1,"deals":2,"outposts":1,"discoveries":16,"projects":8,"techs":15,"fires":0,"fevers":7,"famines":0,"growthPerYear":12.91,"regime":"Autocracy","map":"continent","seed":115,"earlyGini":0.808,"earlyMood":74.9,"earlyWealth":2.19,"lateUnrest":2,"earlyUnrest":0,"lateGrowth":21.71,"lateMood":66.2,"tradeLate":3,"errors":0}
{"years":10,"pop":86,"peakPop":104,"meanPop":76,"meanMood":69.8,"meanGini":0.755,"maxGini":0.875,"meanUnity":0.584,"meanAuth":0.577,"meanOpen":0.567,"meanPious":0.571,"meanIndus":0.528,"meanComm":0.497,"born":186,"died":161,"starved":6,"violence":0,"unrest":0,"coups":0,"secessions":0,"strikes":0,"feuds":10,"crimes":17,"trips":3,"deals":14,"outposts":2,"discoveries":18,"projects":10,"techs":18,"fires":1,"fevers":5,"famines":3,"growthPerYear":7.09,"regime":"Autocracy","map":"continent","seed":152,"earlyGini":0.799,"earlyMood":75,"earlyWealth":2.37,"lateUnrest":0,"earlyUnrest":0,"lateGrowth":-2,"lateMood":66,"tradeLate":17,"errors":0}
{"years":10,"pop":73,"peakPop":73,"meanPop":50.8,"meanMood":64.7,"meanGini":0.814,"maxGini":0.884,"meanUnity":0.406,"meanAuth":0.634,"meanOpen":0.451,"meanPious":0.492,"meanIndus":0.57,"meanComm":0.409,"born":89,"died":116,"starved":6,"violence":0,"unrest":4,"coups":0,"secessions":0,"strikes":1,"feuds":6,"crimes":16,"trips":0,"deals":1,"outposts":1,"discoveries":11,"projects":6,"techs":11,"fires":3,"fevers":5,"famines":4,"growthPerYear":5.91,"regime":"Fractured Town","map":"peninsula","seed":122,"earlyGini":0.806,"earlyMood":70.8,"earlyWealth":2.33,"lateUnrest":4,"earlyUnrest":0,"lateGrowth":6.29,"lateMood":61.4,"tradeLate":1,"errors":0}
{"years":10,"pop":53,"peakPop":73,"meanPop":55.5,"meanMood":67.1,"meanGini":0.811,"maxGini":0.902,"meanUnity":0.514,"meanAuth":0.495,"meanOpen":0.646,"meanPious":0.509,"meanIndus":0.641,"meanComm":0.382,"born":96,"died":139,"starved":4,"violence":0,"unrest":4,"coups":0,"secessions":0,"strikes":1,"feuds":4,"crimes":21,"trips":2,"deals":22,"outposts":1,"discoveries":17,"projects":1,"techs":17,"fires":1,"fevers":10,"famines":2,"growthPerYear":4.09,"regime":"Industrial State","map":"peninsula","seed":159,"earlyGini":0.824,"earlyMood":73.4,"earlyWealth":2.13,"lateUnrest":4,"earlyUnrest":0,"lateGrowth":-5.14,"lateMood":61.5,"tradeLate":24,"errors":0}
{"years":10,"pop":122,"peakPop":136,"meanPop":91.6,"meanMood":70.1,"meanGini":0.72,"maxGini":0.818,"meanUnity":0.607,"meanAuth":0.443,"meanOpen":0.772,"meanPious":0.355,"meanIndus":0.615,"meanComm":0.513,"born":274,"died":172,"starved":2,"violence":0,"unrest":0,"coups":0,"secessions":0,"strikes":0,"feuds":12,"crimes":27,"trips":0,"deals":20,"outposts":5,"discoveries":18,"projects":8,"techs":18,"fires":4,"fevers":4,"famines":2,"growthPerYear":10.36,"regime":"Industrial State","map":"lakeland","seed":129,"earlyGini":0.737,"earlyMood":72.3,"earlyWealth":2.4,"lateUnrest":0,"earlyUnrest":0,"lateGrowth":-0.57,"lateMood":69.2,"tradeLate":20,"errors":0}
{"years":10,"pop":54,"peakPop":95,"meanPop":61.5,"meanMood":69.6,"meanGini":0.806,"maxGini":0.909,"meanUnity":0.511,"meanAuth":0.504,"meanOpen":0.587,"meanPious":0.556,"meanIndus":0.528,"meanComm":0.546,"born":152,"died":153,"starved":2,"violence":0,"unrest":0,"coups":0,"secessions":0,"strikes":0,"feuds":7,"crimes":25,"trips":0,"deals":7,"outposts":1,"discoveries":13,"projects":5,"techs":13,"fires":2,"fevers":3,"famines":2,"growthPerYear":3.91,"regime":"Autocracy","map":"lakeland","seed":166,"earlyGini":0.844,"earlyMood":73.2,"earlyWealth":2.27,"lateUnrest":0,"earlyUnrest":0,"lateGrowth":-2.29,"lateMood":65.8,"tradeLate":7,"errors":0}
{"years":10,"pop":66,"peakPop":109,"meanPop":72,"meanMood":66.5,"meanGini":0.701,"maxGini":0.855,"meanUnity":0.45,"meanAuth":0.652,"meanOpen":0.357,"meanPious":0.601,"meanIndus":0.465,"meanComm":0.483,"born":201,"died":164,"starved":0,"violence":0,"unrest":6,"coups":1,"secessions":0,"strikes":1,"feuds":18,"crimes":30,"trips":0,"deals":0,"outposts":0,"discoveries":9,"projects":7,"techs":9,"fires":0,"fevers":6,"famines":0,"growthPerYear":5.27,"regime":"Fractured Town","map":"river","seed":136,"earlyGini":0.768,"earlyMood":75.2,"earlyWealth":2.33,"lateUnrest":6,"earlyUnrest":0,"lateGrowth":-8.86,"lateMood":60.2,"tradeLate":0,"errors":0}
{"years":10,"pop":63,"peakPop":86,"meanPop":62.6,"meanMood":63.9,"meanGini":0.775,"maxGini":0.848,"meanUnity":0.435,"meanAuth":0.487,"meanOpen":0.487,"meanPious":0.503,"meanIndus":0.503,"meanComm":0.5,"born":157,"died":133,"starved":0,"violence":0,"unrest":4,"coups":1,"secessions":0,"strikes":1,"feuds":9,"crimes":30,"trips":0,"deals":0,"outposts":1,"discoveries":10,"projects":0,"techs":10,"fires":2,"fevers":6,"famines":0,"growthPerYear":4.91,"regime":"Founders’ Village","map":"river","seed":173,"earlyGini":0.797,"earlyMood":72.8,"earlyWealth":2.25,"lateUnrest":4,"earlyUnrest":0,"lateGrowth":-1.14,"lateMood":60.9,"tradeLate":0,"errors":0}
```