	
	var markers = [];
	var cur_pos;
	var map;
	var directionsService = new google.maps.DirectionsService();
	var directionsDisplay;

	function initialize_map() {

		directionsDisplay = new google.maps.DirectionsRenderer();
		var mapOptions = {
			center: { lat: home.lat, lng: home.long},
			zoom: 13,
			panControl: false,    		
			scaleControl: true
		};
		map = new google.maps.Map(document.getElementById('map-canvas'),
			mapOptions);
		var trafficLayer = new google.maps.TrafficLayer();
  		trafficLayer.setMap(map);
		directionsDisplay.setMap(map);
		directionsDisplay.setOptions({
			'preserveViewport' : true
		});
		drawCurLoc();		
	}

	function drawCurLoc(){
		var temp;
		if(navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function(position) {
				temp = new google.maps.LatLng(position.coords.latitude,
					position.coords.longitude);
				cur_pos = new google.maps.Marker({
					position: temp,
					map: map,
					icon : 'google_maps/cur_loc.png'
				});
				drawMarkers();
			}, function(){
				console.log("Geo location service failed, defaulting back to hardcoded current pos");
				temp = new google.maps.LatLng(home.lat,
					home.long);
				cur_pos = new google.maps.Marker({
					position: temp,
					map: map,
					icon : 'google_maps/cur_loc.png'
				});
				drawMarkers();
			});
		}else{
			alert("Your browser does not support geolocation");
		}		
	}

    function drawMarkers(){
    	clearMarkers();
    	for(var i=0; i < locations_list.length; i++){
    		setTimeout(addMarker, (i+1) * 200, locations_list[i]);
    	}
    }

    function addMarker(position) {
    	var temp = new google.maps.LatLng(position.lat, position.long);
    	var temp_marker = new google.maps.Marker({
    		position: temp,
    		map: map,
    		animation: google.maps.Animation.DROP,
    		'cur_pos': cur_pos
    	});
    	google.maps.event.addListener(temp_marker, 'click', function(){
    		var start = this.cur_pos.position;
    		var end = this.position;
    		var request = {
    			origin: new google.maps.LatLng(start.k, start.D),
    			destination: new google.maps.LatLng(end.k, end.D),
    			travelMode: google.maps.TravelMode.DRIVING
    		};
    		directionsService.route(request, function(response, status) {
    			if (status == google.maps.DirectionsStatus.OK) {
    				console.log("%o",response);
    				directionsDisplay.setDirections(response);
    			}
    		});
    	});
    	markers.push(temp_marker);
    }

    function clearMarkers(){
    	for(var i=0; i<markers.length; i++){
    		markers[i].setMap(null);			
    	}
    	markers = [];
    }
    