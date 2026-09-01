<?php
/*
 * DATEX II v3.4 (National Highways extension) — closure payload parsing.
 *
 * Split out of dorset-roads.php so it can be tested against the vendor's own
 * example payloads. Those examples are the only place the three incompatible
 * location shapes appear together, and a parser written against any one of
 * them silently breaks on the other two.
 *
 * This file is INCLUDE-ONLY: it defines functions, touches no network, reads
 * no request, and echoes nothing. NO closing tag.
 */

if (!defined('DORSET_DATEX_LIB')) {
    define('DORSET_DATEX_LIB', 1);

    /**
     * ⚠️ posList IS LATITUDE FIRST.
     * "51.868835 0.525233" is latitude then longitude — the opposite of
     * GeoJSON, of Cesium's fromDegrees, and of the ArcGIS feed the same layer
     * also consumes. Passing it through unflipped puts Dorset in the Indian
     * Ocean. Returns [[lon,lat], ...] so the codebase sees one convention.
     */
    function dx_poslist($s) {
        if (!is_string($s)) return array();
        $n = preg_split('/\s+/', trim($s), -1, PREG_SPLIT_NO_EMPTY);
        $out = array();
        $c = count($n);
        for ($i = 0; $i + 1 < $c; $i += 2) {
            if (!is_numeric($n[$i]) || !is_numeric($n[$i + 1])) continue;
            $out[] = array((float)$n[$i + 1], (float)$n[$i]);   // lon, lat
        }
        return $out;
    }

    /** Walk a nested array by key path, null on any miss. */
    function dx_get($a, $path) {
        foreach ($path as $k) {
            if (!is_array($a) || !array_key_exists($k, $a)) return null;
            $a = $a[$k];
        }
        return $a;
    }

    /** The road number off whichever linear-element holder this shape uses. */
    function dx_road($holder) {
        if (!is_array($holder)) return null;
        $arr = isset($holder['linearWithinLinearElement']) ? $holder['linearWithinLinearElement']
             : (isset($holder['pointAlongLinearElement']) ? $holder['pointAlongLinearElement'] : null);
        if (!is_array($arr)) return null;
        foreach ($arr as $el) {
            $name = dx_get($el, array('linearElement', 'locLinearElementByCode', 'roadName'));
            if (is_string($name) && trim($name) !== '') return trim($name);
        }
        return null;
    }

    function dx_line($holder) {
        return dx_poslist(dx_get($holder, array('locLinearLocation', 'gmlLineString', 'locGmlLineString', 'posList')));
    }

    /**
     * ⚠️ THREE INCOMPATIBLE LOCATION SHAPES, ALL IN THE SAME FEED.
     * Grouped (a situation spanning several stretches), single linear (one
     * stretch), and point (incidents, which carry NO posList at all — just a
     * bare latitude/longitude).
     */
    function dx_geometry($lr) {
        $out = array();
        if (!is_array($lr)) return $out;

        $group = dx_get($lr, array('locLocationGroupByList', 'locationContainedInGroup'));
        if (is_array($group)) {
            foreach ($group as $g) {
                $path = dx_line($g);
                if (count($path)) {
                    $out[] = array('path' => $path,
                                   'road' => dx_road(isset($g['locSingleRoadLinearLocation']) ? $g['locSingleRoadLinearLocation'] : null));
                }
            }
        }

        $single = dx_line($lr);
        if (count($single)) {
            $out[] = array('path' => $single,
                           'road' => dx_road(isset($lr['locSingleRoadLinearLocation']) ? $lr['locSingleRoadLinearLocation'] : null));
        }

        $pt = dx_get($lr, array('locPointLocation', 'pointByCoordinates', 'pointCoordinates'));
        if (is_array($pt) && isset($pt['longitude']) && isset($pt['latitude'])
            && is_numeric($pt['longitude']) && is_numeric($pt['latitude'])) {
            $out[] = array('point' => array((float)$pt['longitude'], (float)$pt['latitude']),
                           'road'  => dx_road(isset($lr['locPointLocation']) ? $lr['locPointLocation'] : null));
        }
        return $out;
    }

    /**
     * Parse a closures payload, keeping only what falls inside $box
     * (array of west, south, east, north). Pass null for no filtering.
     *
     * ⚠️ AN EMPTY RESULT IS AMBIGUOUS AND MUST NOT BE, so the counts that
     * separate "nothing is signed here" from "the parser ate everything" come
     * back alongside: how many situations arrived and how many were `real`.
     *
     * Returns array('closures' => [...], 'national' => n, 'real' => n).
     */
    function dorset_datex_parse($payload, $box = null) {
        $situations = dx_get($payload, array('D2Payload', 'situation'));
        if (!is_array($situations)) return array('closures' => array(), 'national' => 0, 'real' => 0);

        $closures = array();
        $real = 0;
        foreach ($situations as $sit) {
            /*
             * ⚠️ FILTER TO REAL. The informationStatus enum also carries
             * `test`, `securityExercise` and `technicalExercise`. Nothing on
             * the portal warns about this, and an unfiltered map would publish
             * a National Highways training exercise as a live road closure.
             */
            if (dx_get($sit, array('headerInformation', 'informationStatus')) !== 'real') continue;
            $real++;

            $records = (isset($sit['situationRecord']) && is_array($sit['situationRecord'])) ? $sit['situationRecord'] : array();
            foreach ($records as $rec) {
                $m = isset($rec['sitRoadOrCarriagewayOrLaneManagement']) ? $rec['sitRoadOrCarriagewayOrLaneManagement'] : null;
                if (!is_array($m)) continue;
                $spec = dx_get($m, array('validity', 'validityTimeSpecification'));
                $comment = dx_get($m, array('generalPublicComment', 0, 'comment'));

                foreach (dx_geometry(isset($m['locationReference']) ? $m['locationReference'] : null) as $g) {
                    $anchor = isset($g['point']) ? $g['point'] : (isset($g['path'][0]) ? $g['path'][0] : null);
                    if (!is_array($anchor)) continue;
                    if (is_array($box)) {
                        if ($anchor[0] < $box[0] || $anchor[0] > $box[2]
                            || $anchor[1] < $box[1] || $anchor[1] > $box[3]) continue;
                    }
                    $closures[] = array(
                        'id'     => isset($m['idG']) ? $m['idG'] : (isset($sit['idG']) ? $sit['idG'] : null),
                        'road'   => isset($g['road']) ? $g['road'] : null,
                        'status' => dx_get($m, array('validity', 'validityStatus')),
                        'source' => dx_get($m, array('source', 'sourceIdentification')),
                        'start'  => is_array($spec) && isset($spec['overallStartTime']) ? $spec['overallStartTime'] : null,
                        'end'    => is_array($spec) && isset($spec['overallEndTime']) ? $spec['overallEndTime'] : null,
                        'text'   => is_string($comment) ? trim($comment) : null,
                        'path'   => isset($g['path']) ? $g['path'] : null,
                        'point'  => isset($g['point']) ? $g['point'] : null,
                    );
                }
            }
        }
        return array('closures' => $closures, 'national' => count($situations), 'real' => $real);
    }
}
