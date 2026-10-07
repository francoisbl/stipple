# Cartographic demo geometry

`world-countries.geojson` is Natural Earth's 1:50m Admin 0 – Countries dataset.
It provides the complete, recognizable world coverage used by both the
categorized and graduated demonstrations. Antarctica is omitted at runtime
because it is not a country and would distort the useful Web Mercator extent.

Natural Earth data is in the public domain. Source repository:
https://github.com/nvkelso/natural-earth-vector

The countries are demonstration geometry only. For rendering efficiency, the
playground groups their polygon parts into a small number of MultiPolygon
features—one per category or graduated class—while retaining all country
boundaries. Neutral Category A–K labels deliberately avoid suggesting
predefined semantic styles. This grouping does not extend the Pattern,
PatternSet, or PatternSequence data models.

The earlier regional extracts remain checked in for provenance and comparison,
but are no longer loaded by the playground.
