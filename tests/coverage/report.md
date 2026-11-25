# Coverage report (12 runs: archipelago/5/Gentle/20y, archipelago/5/Harsh/20y, continent/5/Gentle/20y, continent/5/Normal/20y, continent/5/Harsh/20y, island/12/Gentle/20y, island/12/Normal/20y, island/12/Harsh/20y, lakeland/351323045/Normal/20y, lakeland/351323045/Harsh/20y, peninsula/21/Harsh/20y, river/33/Harsh/20y)

## Population by year (mean over runs, per Hardship level)

| Year | Gentle | Normal | Harsh |
|---|---|---|---|
| 1 | 31 (3) | 23 (3) | 23 (6) |
| 2 | 63 (3) | 49 (3) | 40 (6) |
| 3 | 113 (3) | 77 (3) | 62 (6) |
| 4 | 201 (3) | 121 (3) | 99 (6) |
| 5 | 383 (3) | 197 (3) | 135 (6) |
| 6 | 670 (3) | 353 (3) | 202 (6) |
| 7 | 1001 (3) | 576 (3) | 297 (6) |
| 8 | 1369 (3) | 829 (3) | 409 (6) |
| 9 | 1497 (3) | 1139 (3) | 551 (6) |
| 10 | 1682 (3) | 1394 (3) | 708 (6) |
| 12 | 1644 (3) | 1749 (3) | 869 (6) |
| 14 | 1857 (3) | 1926 (3) | 986 (6) |
| 16 | 2113 (3) | 2049 (3) | 1072 (6) |
| 18 | 2176 (3) | 2110 (3) | 1167 (6) |
| 20 | 2215 (3) | 2271 (3) | 1271 (6) |
## Difficulty scorecard

| Hardship | runs | game over | median pop y10 | median pop y20 | best peak | target | met |
|---|---|---|---|---|---|---|---|
| Gentle | 3 | 0 | 1758 | 2276 | 2840 | median pop at year 20 above 1000 | yes |
| Normal | 3 | 0 | 1428 | 2310 | 2623 | between Gentle and Harsh | yes |
| Harsh | 6 | 0 | 674 | 1158 | 2195 | hard but survivable: year-10 pop at most 60% of Normal, most runs live, weakest map still grows | yes |

## Game over and faults

- archipelago/5/Gentle: survived 20 years; faults 0; 1.564 ms/tick
- archipelago/5/Harsh: survived 20 years; faults 0; 1.316 ms/tick
- continent/5/Gentle: survived 20 years; faults 0; 1.641 ms/tick
- continent/5/Normal: survived 20 years; faults 0; 1.6 ms/tick
- continent/5/Harsh: survived 20 years; faults 0; 1.295 ms/tick
- island/12/Gentle: survived 20 years; faults 0; 1.705 ms/tick
- island/12/Normal: survived 20 years; faults 0; 1.678 ms/tick
- island/12/Harsh: survived 20 years; faults 0; 1.597 ms/tick
- lakeland/351323045/Normal: survived 20 years; faults 0; 1.515 ms/tick
- lakeland/351323045/Harsh: survived 20 years; faults 0; 1.399 ms/tick
- peninsula/21/Harsh: survived 20 years; faults 0; 1.326 ms/tick
- river/33/Harsh: survived 20 years; faults 0; 1.449 ms/tick

## Concern load (share of days active; flagged above 40%)

| Concern | a5G | a5H | c5G | c5N | c5H | i12G | i12N | i12H | l351323045N | l351323045H | p21H | r33H | max |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| unity ⚠ | 2% | 0% | 0% | 0% | 34% | 24% | 0% | 19% | 9% | 19% | 51% | 22% | 51% |
| food | 1% | 0% | 31% | 30% | 13% | 21% | 11% | 7% | 28% | 16% | 3% | 12% | 31% |
| fuel | 0% | 1% | 0% | 0% | 2% | 9% | 8% | 15% | 0% | 1% | 25% | 1% | 25% |
| outpost:1 | 11% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 10% | 0% | 11% |
| plague | 1% | 0% | 1% | 1% | 1% | 0% | 0% | 0% | 0% | 0% | 7% | 8% | 8% |
| faction | 1% | 0% | 1% | 2% | 4% | 5% | 0% | 2% | 2% | 4% | 7% | 4% | 7% |
| housing | 3% | 3% | 4% | 3% | 5% | 4% | 3% | 1% | 5% | 4% | 6% | 4% | 6% |
| outpost:2 | 0% | 0% | 0% | 0% | 5% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 5% |
| pop_fall | 0% | 0% | 0% | 0% | 1% | 0% | 1% | 0% | 0% | 0% | 0% | 0% | 1% |
| outpost:5 | 0% | 0% | 0% | 1% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 1% |

## Growth limits (share of birth attempts stopped by each gate, by year bracket, all runs)

| Years | attempts | conceived | expecting | too soon | past fertile age | young children | no bed | low food | chance | fertile couples | fertile singles |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1-5 | 8253 | 24% | 5% | 15% | 0% | 35% | 0% | 0% | 22% | 19.0 | 7.1 |
| 6-10 | 17131 | 24% | 2% | 7% | 14% | 2% | 7% | 5% | 38% | 53.7 | 8.7 |
| 11-15 | 16565 | 8% | 0% | 2% | 52% | 0% | 6% | 10% | 21% | 28.8 | 9.4 |
| 16-20 | 14912 | 11% | 1% | 3% | 29% | 1% | 7% | 15% | 33% | 44.0 | 11.9 |

## Deaths and arrivals by year bracket (per run per year)

| Years | births | deaths | old age | hunger | cold | arrivals |
|---|---|---|---|---|---|---|
| 1-5 | 35.1 | 2.1 | 0.0 | 0.2 | 0.0 | 5.4 |
| 6-10 | 192.4 | 34.5 | 15.6 | 0.1 | 0.1 | 23.2 |
| 11-15 | 167.2 | 118.8 | 82.8 | 0.1 | 0.0 | 25.6 |
| 16-20 | 176.4 | 159.5 | 117.9 | 0.0 | 0.0 | 31.3 |

## Events seen (79 of 95 kinds), by group; runs = in how many runs it happened, per-run-year = mean count

| Group | Event | Total | Runs | Per run-year | First (year) |
|---|---|---|---|---|---|
| Economy & expansion | Fish landed by the townsfolk | 670872 | 12/12 | 2795.30 | 3.3 |
| Economy & expansion | Wood fetched by boat | 1660 | 3/12 | 6.92 | 4.0 |
| Economy & expansion | Market deals | 559 | 12/12 | 2.33 | 3.3 |
| Economy & expansion | Fields made by clearing woodland | 537 | 11/12 | 2.24 | 0.2 |
| Economy & expansion | Sites heard of | 325 | 12/12 | 1.35 | 0.4 |
| Economy & expansion | Expeditions returned | 291 | 12/12 | 1.21 | 1.4 |
| Economy & expansion | Home plots made by clearing woodland | 209 | 10/12 | 0.87 | 2.5 |
| Economy & expansion | Terraform works done | 157 | 9/12 | 0.65 | 7.7 |
| Economy & expansion | Jobs invented | 152 | 12/12 | 0.63 | 0.6 |
| Economy & expansion | Timber runs by boat | 94 | 3/12 | 0.39 | 4.0 |
| Economy & expansion | Inventions that failed | 58 | 12/12 | 0.24 | 1.6 |
| Economy & expansion | Peoples discovered | 50 | 12/12 | 0.21 | 0.1 |
| Economy & expansion | Outposts founded | 28 | 12/12 | 0.12 | 2.2 |
| Economy & expansion | Trading trips | 24 | 7/12 | 0.10 | 10.5 |
| Economy & expansion | Harbour upgrades | 21 | 4/12 | 0.09 | 14.6 |
| Economy & expansion | Timber runs lost at sea | 16 | 4/12 | 0.07 | 8.4 |
| Economy & expansion | Boats added for timber | 14 | 7/12 | 0.06 | 5.1 |
| Economy & expansion | Ships built | 11 | 5/12 | 0.05 | 15.6 |
| Economy & expansion | Lessons sold abroad | 7 | 3/12 | 0.03 | 16.1 |
| Economy & expansion | Expeditions lost | 5 | 3/12 | 0.02 | 6.3 |
| Economy & expansion | Outposts broke away | 1 | 1/12 | 0.00 | 8.0 |
| Growth limits | Birth attempts by couples | 56947 | 12/12 | 237.28 | 0.1 |
| Growth limits | Stopped: chance (damping, policy, hardship) | 16830 | 12/12 | 70.13 | 0.1 |
| Growth limits | Stopped: past fertile age | 15542 | 12/12 | 64.76 | 4.1 |
| Growth limits | Conceptions | 9070 | 12/12 | 37.79 | 0.1 |
| Growth limits | Stopped: food stores too low | 4743 | 10/12 | 19.76 | 5.1 |
| Growth limits | Stopped: no free bed | 3331 | 2/12 | 13.88 | 6.2 |
| Growth limits | Stopped: too soon after a birth | 3316 | 12/12 | 13.82 | 0.1 |
| Growth limits | Stopped: too many young children at home | 3293 | 12/12 | 13.72 | 0.4 |
| Growth limits | Stopped: already expecting | 822 | 12/12 | 3.42 | 0.1 |
| Hardship | Wolf attacks | 664 | 12/12 | 2.77 | 0.2 |
| Hardship | Fever outbreaks | 190 | 12/12 | 0.79 | 0.5 |
| Hardship | Harsh winters | 71 | 12/12 | 0.30 | 0.8 |
| Hardship | Droughts | 62 | 12/12 | 0.26 | 0.3 |
| Hardship | Storms | 60 | 12/12 | 0.25 | 0.3 |
| Hardship | Fires | 40 | 11/12 | 0.17 | 0.7 |
| Hardship | Floods | 16 | 9/12 | 0.07 | 3.0 |
| Hardship | Famines | 13 | 7/12 | 0.05 | 2.8 |
| Hardship | Plagues | 7 | 6/12 | 0.03 | 2.0 |
| Hardship | Buildings collapsed | 2 | 2/12 | 0.01 | 15.9 |
| Hardship | Cargoes lost | 2 | 2/12 | 0.01 | 16.3 |
| Knowledge | Discoveries | 406 | 12/12 | 1.69 | 0.7 |
| Knowledge | Lessons learned | 129 | 12/12 | 0.54 | 1.6 |
| Knowledge | New ages | 32 | 12/12 | 0.13 | 3.0 |
| Knowledge | Great works finished | 21 | 11/12 | 0.09 | 2.3 |
| Knowledge | Lessons bought from neighbours | 4 | 3/12 | 0.02 | 18.3 |
| People | Births | 34321 | 12/12 | 143.00 | 0.1 |
| People | Deaths (all) | 18945 | 12/12 | 78.94 | 0.5 |
| People | Died of old age | 13019 | 12/12 | 54.25 | 4.8 |
| People | Died of fever | 5645 | 12/12 | 23.52 | 1.0 |
| People | Newcomers arrive | 5137 | 12/12 | 21.40 | 0.2 |
| People | Couples formed | 2365 | 12/12 | 9.85 | 0.1 |
| People | Dreams achieved | 1317 | 12/12 | 5.49 | 0.6 |
| People | Killed by wolves | 251 | 12/12 | 1.05 | 0.5 |
| People | Starved | 20 | 7/12 | 0.08 | 2.8 |
| People | Cabins built | 17 | 9/12 | 0.07 | 2.2 |
| People | Froze | 4 | 2/12 | 0.02 | 7.0 |
| Society | Funerals | 4717 | 12/12 | 19.65 | 0.6 |
| Society | Council decisions | 3149 | 12/12 | 13.12 | 0.1 |
| Society | Weddings | 1973 | 12/12 | 8.22 | 0.1 |
| Society | Estates passed on | 1628 | 12/12 | 6.78 | 0.6 |
| Society | Holidays | 1506 | 12/12 | 6.28 | 0.1 |
| Society | Trials | 1125 | 12/12 | 4.69 | 0.2 |
| Society | Thefts | 1089 | 12/12 | 4.54 | 0.1 |
| Society | Elections | 302 | 12/12 | 1.26 | 0.2 |
| Society | Concerns raised | 266 | 12/12 | 1.11 | 0.4 |
| Society | Feuds begun | 166 | 12/12 | 0.69 | 2.8 |
| Society | Feuds mended | 160 | 12/12 | 0.67 | 3.9 |
| Society | Critical concerns | 114 | 11/12 | 0.47 | 2.8 |
| Society | Overtime calls | 71 | 11/12 | 0.30 | 0.6 |
| Society | Assaults | 39 | 4/12 | 0.16 | 5.0 |
| Society | Rival councils | 28 | 9/12 | 0.12 | 3.6 |
| Society | Banishments | 26 | 9/12 | 0.11 | 7.4 |
| Society | Strikes | 25 | 9/12 | 0.10 | 2.7 |
| Society | Sects founded | 15 | 12/12 | 0.06 | 3.1 |
| Society | Coups | 12 | 10/12 | 0.05 | 1.9 |
| Society | Civil strife | 8 | 5/12 | 0.03 | 4.7 |
| Society | Purges | 6 | 4/12 | 0.03 | 4.3 |
| Society | Guilds founded | 2 | 1/12 | 0.01 | 16.3 |

## Never seen in any run (16)

Lost at sea; Killed in raids or strife; Uprisings; Reforms; Secessions; Outposts failed; Bridges built; Crafts taken by our spies; Campaigns launched; Campaigns won; Campaigns lost; Campaigns drawn; Outposts attacked; Outpost attacks beaten off; Responses tried; Knowledge lost
