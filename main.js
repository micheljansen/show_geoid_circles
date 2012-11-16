var map;
var paris_center = new google.maps.LatLng(48.849607,2.369799);
var paris_bounds = new google.maps.LatLngBounds(
  new google.maps.LatLng(48.6826472764688,2.13424956576032),
  new google.maps.LatLng(49.0160829026163,2.60692165753642));

var geoids = [];

var circles = [];

var geoids_shown = [];
var marker_for = {};

var LOWER_CUTOFF = 60;
var UPPER_CUTOFF = 300;

var marker_s = new google.maps.MarkerImage("marker.png", new google.maps.Size(17,17), new google.maps.Point(0,0), new google.maps.Point(8.5,8.5), new google.maps.Size(17,17));
var marker_m = new google.maps.MarkerImage("marker.png", new google.maps.Size(34,34), new google.maps.Point(0,0), new google.maps.Point(17,17));
var marker_l = new google.maps.MarkerImage("marker.png", new google.maps.Size(68,68), new google.maps.Point(0,0), new google.maps.Point(34,34), new google.maps.Size(68,68));

function initialize() {
  var mapOptions = {
    zoom: 10,
    center: paris_center,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  map = new google.maps.Map(document.getElementById('map_canvas'),
                            mapOptions);
                            map.fitBounds(paris_bounds);

                            google.maps.event.addListener(map, 'zoom_changed', function() {
                              //console.log("zoom_changed");
                              draw_geoids();
                            });

/*
    google.maps.event.addListener(map, 'dragstart', function() {
    });
*/

                            google.maps.event.addListener(map, 'dragend', function() {
                              //console.log("dragend");
                              draw_geoids();
                            });

/*
    google.maps.event.addListener(map, 'bounds_changed', function() {
      console.log("new bounds", map.getBounds().toString());
      //draw_geoids();
    });
*/

                            google.maps.event.addListener(map, 'idle', function() {
                              //console.log("idle", map.getBounds().toString());
                              draw_geoids();
                            });

                            // fetch geoids
                            $.ajax("data/all_geoids_in_paris.json").done(function(data) {
                              geoids = _(data).chain()
                              //.reject(function(e) {return e.num_results == 0 || e.type == "postcode";})
                              .sortBy(function(e) {return -e.radius})
                              .value();
                              draw_geoids();
                            });
}

function display_radius() {
  var bounds = map.getBounds() ? map.getBounds() : paris_bounds;
  return google.maps.geometry.spherical.computeDistanceBetween (bounds.getNorthEast(), bounds.getSouthWest())/2;
}

function meters_per_pixel() {
  var pixel_radius = Math.sqrt(Math.pow($("#map_canvas").width(), 2) + Math.pow($("#map_canvas").height(), 2))/2;
  var mpp = display_radius() / pixel_radius;
  //console.log(pixel_radius, display_radius(), mpp);
  return mpp;
}

function clear_circles() {
  $(circles).each(function(i,c) {
    c.setMap(null);
  });
  circles = [];
}

function draw_geoids() {
  var mpp = meters_per_pixel();
  var min_geoid_size_m = LOWER_CUTOFF*mpp;
  var max_geoid_size_m = UPPER_CUTOFF*mpp;
  var minkm = min_geoid_size_m / 1000;
  var maxkm = max_geoid_size_m / 1000;

  var map_bounds = map.getBounds() ? map.getBounds() : paris_bounds;

  var candidates = _(geoids).filter(function(e) {
/*
      var bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(e.min_lat, e.min_long),
            new google.maps.LatLng(e.max_lat, e.max_long));
      return map_bounds.intersects(bounds);
*/
    return map_bounds.contains(new google.maps.LatLng(e.lat, e.long));
  });

  var num_candidates = candidates.length;
  var N = 10;

  // we don't want to show geo ids that are too big
  // skip the list until we reach the first geo id that is not too big to show
  // or we reach the last N
  var found = false;
  var i = -1;
  while(i < Math.max(-1, num_candidates-N-1) && !found) {
    i++;
    if(candidates[i].radius > minkm) {
      // too big
    }
    else {
      found = true;
    }
  }

  // at this point, i points to the first element that is not too big


  // find the first N geoids to show
  var geoids_to_show = [];
  while(i < num_candidates-1 && geoids_to_show.length < N) {
    i++;
    var geoid = candidates[i];

    if(!_(geoids_to_show).find(function(e) {
      // is this geoid contained in this already shown bigger geoid?
      var bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(e.min_lat, e.min_long),
        new google.maps.LatLng(e.max_lat, e.max_long));
        return bounds.contains(new google.maps.LatLng(geoid.lat, geoid.long));
    })) {
      // this geoid does not fall in any already shown geoid
      if(geoid == undefined) {
        console.log("geoid undefined");
      }
      geoids_to_show.push(geoid);
    }
    else {
      //console.log("rejecting overlapping", geoid);
    }
  }

  // stash this away before messing with it
  var geoids_shown_now = geoids_shown;


  geoids_shown = geoids_to_show;
  // find out which geoids to add (in), which to remove (out)
  // this could be more efficient, but hey
  var geoids_in = _.difference(geoids_to_show, geoids_shown_now);
  var geoids_out = _.difference(geoids_shown_now, geoids_to_show);

  _(geoids_in).each(function(e) {
    if(true) {

      var c = new google.maps.Circle({
        center: new google.maps.LatLng(e.lat, e.long),
        radius: e.radius*1000,
        strokeColor: "#48B6E7",
        fillColor: "white",
        strokeWeight: 1,
        strokeOpacity: 1,
        fillOpacity: 0.2,
      });

      var marker_image = marker_m;
      var msize = e.radius * 1000 / mpp;
      marker_image = msize > 68 ? marker_l : (msize < 20 ? marker_s : marker_m)
      var m = new google.maps.Marker({
        position: new google.maps.LatLng(e.lat, e.long),
        clickable: true,
        fillColor: "#48B6E7",
        strokeWeight: 2,
        strokeOpacity: 1,
        fillOpacity: 1,
        flat: true,
        title: e.title +" ("+e.num_results+")",
        icon: marker_image,
        visible: true,
        map: map
      });

      marker_for[e.geoid] = m;

      google.maps.event.addListener(m, 'mouseout', function() {
        c.setMap(null);
      });

      google.maps.event.addListener(m, 'mouseover', function() {
        c.setMap(map);
      });

      google.maps.event.addListener(m, 'click', function() {
        var bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(e.min_lat, e.min_long),
          new google.maps.LatLng(e.max_lat, e.max_long));

          map.fitBounds(bounds);
      });

    }
  });

  // fix marker images for existing geo ids that changed
  _(geoids_to_show).each(function(e) {
    var msize = e.radius * 1000 / mpp;
    marker_image = msize > 68 ? marker_l : (msize < 20 ? marker_s : marker_m)
    marker_for[e.geoid].setIcon(marker_image);
  });


  // remove old ones
  _(geoids_out).each(function(e) {
    // remove
    if(marker_for[e.geoid]) {
      marker_for[e.geoid].setMap(null);
      delete marker_for[e.geoid];
    }
  });
}

google.maps.event.addDomListener(window, 'load', initialize);
