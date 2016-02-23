/*global WM, Application*/

Application.$controller('GooglemapsController', ['$scope', 'Utils', '$element', 'NgMap', '$timeout',
    function ($s, Utils, $el, NgMap, $timeout) {
        'use strict';
        var _locations = [],
            _icon = '',
            _lat  = '',
            _lng  = '',
            _info = '',
            _color,
            _radius,
            perimeter,
            defaultCenter       = 'current-position',
            _oldBoundLocations  = -1,
            markerLat,
            markerLng,
            _buildMap,
            _updateDirections,
            _deregisterFns = {'directions': _.noop, 'init': _.noop};

        $s.maps = $s.directionsData = [];
        $s.$on('mapInitialized', function (event, evtMap) {
            $s.maps.push(evtMap);
            var mapData    = $s.maps[0],
                markers    = mapData.markers,
                markerKeys = _.keys(markers);

            //now call the refresh method to resize map, needed when the map is inside the dialogs or any other hidden element
            refresh();

            Utils.triggerFn(_deregisterFns.init);
            _deregisterFns.init = $s.$watch(function () {
                if ($el[0].clientHeight) {
                    Utils.triggerFn(_deregisterFns.init);
                    if (markerKeys && markerKeys.length === 1) {
                        mapData.panTo(new google.maps.LatLng(markerLat, markerLng));
                    } else {
                        mapData.panTo(mapData.getCenter());
                    }
                }
            });
        });

        function buildMap() {
            var lat, lng, latlng,
                len,
                latSum      = 0,
                lngSum      = 0,
                latNaNCount = 0,
                lngNaNCount = 0;

            if (_locations) {
                if (!_lat || !_lng) {
                    return;
                }
                $s.markersData = _locations.map(function (marker, index) {
                    lat = Utils.findValueOf(marker, _lat);
                    lng = Utils.findValueOf(marker, _lng);
                    if (lat && lng) {
                        latlng = '[' + lat + ', ' + lng + ']';
                        markerLat = lat;
                        markerLng = lng;
                    }
                    if (isNaN(lat)) {
                        latNaNCount++;
                    } else {
                        latSum += lat;
                    }
                    if (isNaN(lng)) {
                        lngNaNCount++;
                    } else {
                        lngSum += lng;
                    }
                    return {
                        'latlng'      : latlng,
                        'iconData'    : _icon ? Utils.findValueOf(marker, _icon) : '',
                        'information' : _info ? Utils.findValueOf(marker, _info) : '',
                        'id'          : $s.$id + '_' + index,
                        'color'       : _color ? Utils.findValueOf(marker, _color) : '',
                        'radius'      : _radius ? Utils.findValueOf(marker, _radius) : ''
                    };
                });
                len       = $s.markersData.length;
                $s.center = (len === latNaNCount || len === lngNaNCount) ? '[0,0]' : '[' + latSum/(len-latNaNCount) + ', ' + lngSum/(len-lngNaNCount) + ']';
            } else {
                $s.center = defaultCenter;
            }
        }

        _buildMap = _.debounce(buildMap, 50);

        function onLocationsChange(newVal) {

            var markerObj,
                wp = $s.$parent.widgetProps,
                options;

            _locations = [];

            if (WM.isArray(newVal)) {
                _locations = newVal;
            } else {
                if (WM.isObject(newVal)) {
                    if (WM.isArray(newVal.data)) {
                        _locations = newVal.data;
                    } else {
                        _locations = [newVal];
                    }
                }
            }

            if ($s.widgetid) {

                options = [''];

                wp.lat.options     = options;
                wp.lng.options     = options;
                wp.icon.options    = options;
                wp.info.options    = options;
                wp.shade.options   = options;
                wp.radius.options  = options;

                if (_locations.length > 0) {
                    markerObj = _locations[0];

                    Utils.getAllKeysOf(markerObj).forEach(function (key) {
                        options.push(key);
                    });
                }

                if ((_oldBoundLocations !== -1) && (_oldBoundLocations !== $s.bindlocations)) {
                    /*Remove the attributes from the markup*/
                    $s.$root.$emit('set-markup-attr', $s.$parent.widgetid, {
                        'lat'       : '',
                        'lng'       : '',
                        'icon'      : '',
                        'info'      : '',
                        'shade'     : '',
                        'radius'    : '',
                        'perimeter' : ''
                    });
                    $s.lat        = '';
                    $s.lng        = '';
                    $s.icon       = '';
                    $s.info       = '';
                    $s.shade      = '';
                    $s.radius     = '';
                    $s.perimeter  = '';

                    _oldBoundLocations = $s.bindlocations;
                }

                if (_oldBoundLocations === -1) {
                    _oldBoundLocations = $s.bindlocations;
                }
            }

            _buildMap();
        }

        function updateDirections() {
            if($s.origin && $s.destination) {
                Utils.triggerFn(_deregisterFns.directions);

                //watch for the directions
                _deregisterFns.directions = $s.$watch(':: maps[0].directionsRenderers[0]', function (nv) {
                    if (nv.directions) {
                        var routeDetails;

                        routeDetails = nv.directions.routes[0].legs[0];
                        $s.distance  = routeDetails.distance.text;
                        $s.duration  = routeDetails.duration.text;
                    }
                });
            }
        }

        _updateDirections = _.debounce(updateDirections, 50);

        /* Define the property change handler. This function will be triggered when there is a change in the prefab property */
        function propertyChangeHandler(key, newVal) {
            switch (key) {
                case 'locations':
                    onLocationsChange(newVal);
                    break;
                case 'lat':
                    _lat = newVal;
                    _buildMap();
                    break;
                case 'lng':
                    _lng = newVal;
                    _buildMap();
                    break;
                case 'icon':
                    _icon = newVal;
                    _buildMap();
                    break;
                case 'info':
                    _info = newVal;
                    _buildMap();
                    break;
                case 'shade':
                    _color = newVal;
                    _buildMap();
                    break;
                case 'radius':
                    _radius = newVal;
                    _buildMap();
                    break;
                case 'zoom':
                    if (!isNaN(newVal)) {
                        $s.zoom = newVal;
                    }
                    break;
                case 'origin':
                    $s.directionsData.origin = newVal;
                    _updateDirections();
                    break;
                case 'destination':
                    $s.directionsData.destination = newVal;
                    _updateDirections();
                    break;
                case 'perimeter':
                    perimeter = newVal;
                    break;
                case 'trafficlayer':
                    $s.trafficlayer = newVal;
                    break;
            }
        }

        /* register the property change handler */
        $s.propertyManager.add($s.propertyManager.ACTIONS.CHANGE, propertyChangeHandler);

        function refresh() {
            //re-size the map whenever the map is loaded in any container like dialog, tabs or any hidden elements
            $timeout(function(){
                google.maps.event.trigger($s.maps[0], 'resize');
            }, 100);
        }

        $s.refresh = refresh;
        $el.closest('.app-prefab').isolateScope().redraw = refresh;
    }]);