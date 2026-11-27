# Coverage report (6 runs: continent/12/Gentle/30y, continent/12/Normal/30y, continent/12/Harsh/30y, island/12/Gentle/30y, island/12/Normal/30y, island/12/Harsh/30y)

## Population by year (mean over runs, per Hardship level)

| Year | Gentle | Normal | Harsh |
|---|---|---|---|
| 1 | 17 (2) | 17 (2) | 13 (2) |
| 2 | 22 (2) | 19 (2) | 17 (2) |
| 3 | 27 (2) | 23 (2) | 18 (2) |
| 4 | 36 (2) | 29 (2) | 20 (2) |
| 5 | 43 (2) | 36 (2) | 23 (2) |
| 6 | 54 (2) | 39 (2) | 30 (2) |
| 7 | 60 (2) | 49 (2) | 37 (2) |
| 8 | 71 (2) | 58 (2) | 40 (2) |
| 9 | 82 (2) | 60 (2) | 44 (2) |
| 10 | 96 (2) | 71 (2) | 39 (2) |
| 12 | 124 (2) | 90 (2) | 44 (2) |
| 14 | 149 (2) | 110 (2) | 48 (2) |
| 16 | 243 (2) | 138 (2) | 57 (2) |
| 18 | 367 (2) | 191 (2) | 78 (2) |
| 20 | 553 (2) | 267 (2) | 84 (2) |
| 22 | 667 (2) | 388 (2) | 103 (2) |
| 24 | 776 (2) | 520 (2) | 121 (2) |
| 26 | 883 (2) | 617 (2) | 124 (2) |
| 28 | 1037 (2) | 690 (2) | 187 (2) |
| 30 | 1180 (2) | 782 (2) | 268 (2) |
## Difficulty scorecard

| Hardship | runs | game over | median pop y10 | median pop y20 | median pop y30 | best peak | target | met |
|---|---|---|---|---|---|---|---|---|
| Gentle | 2 | 0 | 91 | 515 | 1138 | 1222 | year-30 pop at least 1.25 times Normal (or year 20 above Normal if runs are short) | yes |
| Normal | 2 | 0 | 58 | 214 | 663 | 900 | between Gentle and Harsh | yes |
| Harsh | 2 | 0 | 30 | 72 | 184 | 352 | hard but survivable: year-30 pop at most 60% of Normal (year 10 if runs are short), most runs live, weakest map still grows | yes |

## Game over and faults

- continent/12/Gentle: survived 30 years; faults 0; 1.048 ms/tick
- continent/12/Normal: survived 30 years; faults 0; 1.007 ms/tick
- continent/12/Harsh: survived 30 years; faults 0; 0.457 ms/tick
- island/12/Gentle: survived 30 years; faults 0; 0.972 ms/tick
- island/12/Normal: survived 30 years; faults 0; 0.84 ms/tick
- island/12/Harsh: survived 30 years; faults 0; 0.587 ms/tick

## Concern load (share of days active; flagged above 40%)

| Concern | c12G | c12N | c12H | i12G | i12N | i12H | max |
|---|---|---|---|---|---|---|---|
| unity ⚠ | 17% | 0% | 50% | 50% | 20% | 0% | 50% |
| food | 2% | 2% | 12% | 0% | 0% | 0% | 12% |
| pop_fall | 0% | 0% | 9% | 1% | 2% | 2% | 9% |
| housing | 3% | 3% | 7% | 1% | 0% | 1% | 7% |
| pop_slide | 0% | 0% | 5% | 0% | 0% | 0% | 5% |
| plague | 4% | 4% | 3% | 4% | 3% | 3% | 4% |
| faction | 1% | 0% | 3% | 2% | 3% | 0% | 3% |
| outpost:2 | 0% | 0% | 0% | 0% | 2% | 0% | 2% |
| fuel | 0% | 0% | 0% | 0% | 0% | 0% | 0% |

## Growth limits (share of birth attempts stopped by each gate, by year bracket, all runs)

| Years | attempts | conceived | expecting | too soon | past fertile age | young children | no bed | low food | chance | fertile couples | fertile singles |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1-5 | 3338 | 4% | 6% | 22% | 26% | 40% | 0% | 0% | 2% | 3.7 | 1.6 |
| 6-10 | 5210 | 5% | 4% | 14% | 45% | 28% | 0% | 0% | 4% | 7.9 | 3.1 |
| 11-15 | 6323 | 7% | 4% | 12% | 47% | 24% | 0% | 0% | 6% | 13.6 | 5.3 |
| 16-20 | 7172 | 11% | 3% | 16% | 49% | 13% | 0% | 0% | 9% | 20.0 | 5.8 |
| 21-30 | 14034 | 9% | 1% | 11% | 60% | 8% | 0% | 0% | 10% | 20.9 | 6.4 |

## Deaths and arrivals by year bracket (per run per year)

| Years | births | deaths | old age | hunger | cold | arrivals |
|---|---|---|---|---|---|---|
| 1-5 | 4.4 | 1.2 | 0.0 | 0.0 | 0.0 | 1.1 |
| 6-10 | 8.8 | 5.1 | 2.1 | 0.1 | 0.0 | 1.5 |
| 11-15 | 13.7 | 7.8 | 3.4 | 0.3 | 0.0 | 1.7 |
| 16-20 | 42.1 | 17.4 | 8.7 | 0.0 | 0.0 | 9.2 |
| 21-30 | 75.2 | 50.5 | 29.6 | 0.0 | 0.0 | 15.2 |

## Events seen (71 of 95 kinds), by group; runs = in how many runs it happened, per-run-year = mean count

| Group | Event | Total | Runs | Per run-year | First (year) |
|---|---|---|---|---|---|
| Economy & expansion | Fish landed by the townsfolk | 62555 | 6/6 | 347.53 | 14.3 |
| Economy & expansion | Market deals | 292 | 6/6 | 1.62 | 2.5 |
| Economy & expansion | Fields made by clearing woodland | 277 | 6/6 | 1.54 | 0.2 |
| Economy & expansion | Expeditions returned | 177 | 6/6 | 0.98 | 3.1 |
| Economy & expansion | Sites heard of | 165 | 6/6 | 0.92 | 0.4 |
| Economy & expansion | Terraform works done | 117 | 6/6 | 0.65 | 11.1 |
| Economy & expansion | Jobs invented | 117 | 6/6 | 0.65 | 0.6 |
| Economy & expansion | Home plots made by clearing woodland | 96 | 5/6 | 0.53 | 12.3 |
| Economy & expansion | Trading trips | 56 | 4/6 | 0.31 | 21.3 |
| Economy & expansion | Inventions that failed | 42 | 6/6 | 0.23 | 1.3 |
| Economy & expansion | Harbour upgrades | 27 | 4/6 | 0.15 | 21.4 |
| Economy & expansion | Peoples discovered | 27 | 6/6 | 0.15 | 0.1 |
| Economy & expansion | Outposts founded | 25 | 6/6 | 0.14 | 6.6 |
| Economy & expansion | Ships built | 15 | 5/6 | 0.08 | 10.3 |
| Economy & expansion | Lessons sold abroad | 15 | 4/6 | 0.08 | 22.3 |
| Economy & expansion | Crafts taken by our spies | 3 | 2/6 | 0.02 | 25.6 |
| Economy & expansion | Expeditions lost | 1 | 1/6 | 0.01 | 19.2 |
| Growth limits | Birth attempts by couples | 36107 | 6/6 | 200.59 | 0.1 |
| Growth limits | Stopped: past fertile age | 18148 | 6/6 | 100.82 | 1.5 |
| Growth limits | Stopped: too many young children at home | 6441 | 6/6 | 35.78 | 0.8 |
| Growth limits | Stopped: too soon after a birth | 4878 | 6/6 | 27.10 | 0.2 |
| Growth limits | Conceptions | 2903 | 6/6 | 16.13 | 0.1 |
| Growth limits | Stopped: chance (damping, policy, hardship) | 2675 | 6/6 | 14.86 | 0.1 |
| Growth limits | Stopped: already expecting | 1062 | 6/6 | 5.90 | 0.1 |
| Hardship | Wolf attacks | 396 | 6/6 | 2.20 | 0.2 |
| Hardship | Fever outbreaks | 121 | 6/6 | 0.67 | 0.6 |
| Hardship | Storms | 58 | 6/6 | 0.32 | 0.3 |
| Hardship | Droughts | 49 | 6/6 | 0.27 | 0.3 |
| Hardship | Harsh winters | 44 | 6/6 | 0.24 | 0.8 |
| Hardship | Fires | 26 | 6/6 | 0.14 | 2.4 |
| Hardship | Plagues | 9 | 6/6 | 0.05 | 22.6 |
| Hardship | Famines | 8 | 3/6 | 0.04 | 0.3 |
| Hardship | Floods | 6 | 6/6 | 0.03 | 24.0 |
| Hardship | Cargoes lost | 5 | 3/6 | 0.03 | 25.2 |
| Hardship | Buildings collapsed | 1 | 1/6 | 0.01 | 15.8 |
| Knowledge | Discoveries | 251 | 6/6 | 1.39 | 1.1 |
| Knowledge | Lessons learned | 84 | 6/6 | 0.47 | 1.0 |
| Knowledge | Great works finished | 34 | 6/6 | 0.19 | 4.3 |
| Knowledge | New ages | 20 | 6/6 | 0.11 | 6.4 |
| Knowledge | Lessons bought from neighbours | 18 | 3/6 | 0.10 | 22.9 |
| People | Births | 6598 | 6/6 | 36.66 | 0.2 |
| People | Deaths (all) | 3984 | 6/6 | 22.13 | 0.3 |
| People | Died of old age | 2204 | 6/6 | 12.24 | 6.0 |
| People | Died of fever | 1574 | 6/6 | 8.74 | 1.3 |
| People | Newcomers arrive | 1319 | 6/6 | 7.33 | 0.4 |
| People | Couples formed | 1272 | 6/6 | 7.07 | 0.1 |
| People | Dreams achieved | 796 | 6/6 | 4.42 | 1.6 |
| People | Killed by wolves | 191 | 6/6 | 1.06 | 0.6 |
| People | Cabins built | 18 | 6/6 | 0.10 | 3.6 |
| People | Starved | 14 | 3/6 | 0.08 | 0.3 |
| Society | Council decisions | 2310 | 6/6 | 12.83 | 0.1 |
| Society | Funerals | 2079 | 6/6 | 11.55 | 0.3 |
| Society | Holidays | 1192 | 6/6 | 6.62 | 0.1 |
| Society | Estates passed on | 1002 | 6/6 | 5.57 | 0.6 |
| Society | Weddings | 1002 | 6/6 | 5.57 | 0.1 |
| Society | Thefts | 409 | 6/6 | 2.27 | 0.9 |
| Society | Trials | 409 | 6/6 | 2.27 | 1.0 |
| Society | Elections | 237 | 6/6 | 1.32 | 0.2 |
| Society | Concerns raised | 94 | 6/6 | 0.52 | 0.4 |
| Society | Feuds begun | 58 | 6/6 | 0.32 | 4.4 |
| Society | Feuds mended | 52 | 6/6 | 0.29 | 5.2 |
| Society | Critical concerns | 25 | 6/6 | 0.14 | 0.4 |
| Society | Guilds founded | 15 | 4/6 | 0.08 | 22.8 |
| Society | Rival councils | 14 | 4/6 | 0.08 | 6.8 |
| Society | Coups | 10 | 4/6 | 0.06 | 2.8 |
| Society | Sects founded | 8 | 6/6 | 0.04 | 3.1 |
| Society | Purges | 7 | 3/6 | 0.04 | 4.3 |
| Society | Overtime calls | 7 | 3/6 | 0.04 | 0.4 |
| Society | Strikes | 6 | 3/6 | 0.03 | 7.3 |
| Society | Banishments | 6 | 3/6 | 0.03 | 6.6 |
| Society | Civil strife | 1 | 1/6 | 0.01 | 12.6 |

## Never seen in any run (24)

Froze; Lost at sea; Killed in raids or strife; Uprisings; Reforms; Secessions; Assaults; Outposts failed; Outposts broke away; Bridges built; Campaigns launched; Campaigns won; Campaigns lost; Campaigns drawn; Outposts attacked; Outpost attacks beaten off; Timber runs by boat; Timber runs lost at sea; Wood fetched by boat; Boats added for timber; Responses tried; Knowledge lost; Stopped: no free bed; Stopped: food stores too low
