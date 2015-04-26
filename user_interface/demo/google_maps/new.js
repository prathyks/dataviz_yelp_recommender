	
	var markers = [];
	var cur_pos;
	var map;
	var directionsService = new google.maps.DirectionsService();
	var directionsDisplay;
	var distance_cache = [];
	var maxDist=0;

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
  		//trafficLayer.setMap(map);
		//directionsDisplay.setMap(map);
		directionsDisplay.setOptions({
			'preserveViewport' : true,
			'suppressMarkers': true
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
				console.log("Calling calculateDistances");
				calculateDistances(temp);
				//drawMarkers();
			}, function(){
				console.log("Geo location service failed, defaulting back to hardcoded current pos");				
				temp = new google.maps.LatLng(home.lat,
					home.long);
				cur_pos = new google.maps.Marker({
					position: temp,
					map: map,
					icon : 'google_maps/cur_loc.png'
				});
				console.log("Calling calculateDistances");
				calculateDistances(temp);
				//drawMarkers();
			});
		}else{
			alert("Your browser does not support geolocation");
		}
	}

	function calculateDistances(curr_pos){

		var cur_long = curr_pos.D;
		var cur_lat = curr_pos.k;
		for(var i=0; i<kshf.dt.MainTable.length; i++){
			var lat = kshf.dt.MainTable[i].data[8];
			var longitude = kshf.dt.MainTable[i].data[9];
			var distance = getDistanceFromLatLonInKm(cur_lat,cur_long, lat, longitude);
			//console.log("distance:"+distance);
			kshf.dt.MainTable[i].data.push(distance);
			if(distance > maxDist)
				maxDist = distance;
			distance_cache[Number(kshf.dt.MainTable[i].data[0])] = Number(distance);
		}
		console.log("distance_cache:%o",distance_cache);
	}

	function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
	  var R = 6371; // Radius of the earth in km
	  var dLat = deg2rad(lat2-lat1);  // deg2rad below
	  var dLon = deg2rad(lon2-lon1); 
	  var a = 
	    Math.sin(dLat/2) * Math.sin(dLat/2) +
	    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
	    Math.sin(dLon/2) * Math.sin(dLon/2)
	    ; 
	  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	  var d = R * c; // Distance in km
	  return d;
	}

	function deg2rad(deg) {
	  return deg * (Math.PI/180)
	}

    function drawMarkers(locations){
    	for(var i=0; i < locations.length; i++){
    		setTimeout(addMarker, (i+1) * 30, locations[i]);
    	}
    }

    function addMarker(location) {
    	var temp = new google.maps.LatLng(location.lat, location.longitude);
    	var temp_marker = new google.maps.Marker({
    		position: temp,
    		map: map,
    		animation: google.maps.Animation.DROP,
    		//icon: 'google_maps/map_markers/'+location.marker,
    		icon: 'google_maps/bdot.png',
    		'cur_pos': cur_pos
    	});
    	google.maps.event.addListener(temp_marker, 'mouseover', function(){
    		var start = this.cur_pos.position;
    		var end = this.position;
    		var request = {
    			origin: new google.maps.LatLng(start.k, start.D),
    			destination: new google.maps.LatLng(end.k, end.D),
    			travelMode: google.maps.TravelMode.DRIVING
    		};
    		hideAllMarkersExcept(temp_marker);
    		directionsService.route(request, function(response, status) {
    			if (status == google.maps.DirectionsStatus.OK) {
    				// console.log("%o",response);
    				directionsDisplay.setMap(map);
    				directionsDisplay.setDirections(response);
    			}
    		});
    	});
    	google.maps.event.addListener(temp_marker, 'mouseout', function(){
    		showAllMarkers();
    		directionsDisplay.setMap(null);
    	});
    	markers.push(temp_marker);
    }

    function clearMarkers(){
    	for(var i=0; i<markers.length; i++){
    		markers[i].setMap(null);
    	}
    	markers = [];
    }

    function hideAllMarkersExcept(marker){
    	for(var i=0; i<markers.length; i++){
    		if(markers[i] == marker)
    			continue;
    		markers[i].setMap(null);
    	}
    }

    function showAllMarkers(){
    	for(var i=0; i<markers.length; i++){
    		markers[i].setMap(map);
    	}
    }

    function update_maps(dataItems){
    	//dataItems = dataItems.split("\n");
    	clearMarkers();
    	var pins = [];
    	//console.log("d:%o",kshf.dt.Categories[2].data);
    	for(var i=0; i<10 && i<dataItems.length; i++){
    		var parts = dataItems[i];
    		var catid = parts[1];
    		var lat = parts[8];
    		var longitude = parts[9];
    		var ratings = parts[2];
    		var pricerange = parts[3];
    		var name = parts[11];
    		if(kshf.dt.Categories[catid] === undefined)
    			continue;
    		var catData = kshf.dt.Categories[catid].data;
    		var category = catData[1];
    		var marker = catData[3];
    		//console.log(catData[1]);
    		//console.log("parts:"+parts);
    		pins.push({
    			"lat":lat,
    			"longitude":longitude,
    			"ratings":ratings,
    			"pricerange":pricerange,
    			"name":name,
    			"category":category,
    			"marker":marker
    			});
    		console.log(i+":"+dataItems[i]);
    	}
    	// console.log("markers:"+markers.length);
    	drawMarkers(pins);
    }

	function Comparator(a,b){
		if (a[a.length-1] > b[b.length-1]) return -1;
		if (a[a.length-1] < b[b.length-1]) return 1;
		return 0;
	}

	function update_maps_from_slider(dataItems, price, Distance, Rating){
		dataItems = dataItems.split("\n");
		//clearMarkers();
		// var pins = [];
		var itemsasArr = [];
		//console.log(price + " " + Rating);
		//console.log("d:%o",kshf.dt.Price_Range[1].data);
		//TODO:: Change 99 and put data length..
		var max_d = 0;
		for(var i=0; i<dataItems.length-1; i++) {
			var parts = dataItems[i].split(",");
			var dist = distance_cache[Number(parts[0])]
			if(distance_cache[Number(parts[0])] > max_d)
				max_d = dist;
		}

		for(var i=0; i<dataItems.length-1; i++) {
			var parts = dataItems[i].split(",");
			//console.log("d:%o",Number(parts[2]));
			try{
				//console.log("d:%o",kshf.dt.Ratings[Number(parts[2])].data);
				var ratingrow = kshf.dt.Ratings[Number(parts[2])].data;
				var pricerow = kshf.dt.Price_Range[Number(parts[3])].data;
				var distancerow = distance_cache[Number(parts[0])];
			}
			catch(err){
				console.log(parts[0]+" "+parts[2]+" "+parts[3])
			}

			var distancerange = distancerow/max_d * Distance/100;
			console.log("dis:"+distancerow);
			var pricerange = ((5-pricerow[1])*price/100)/4;
			var ratings = (ratingrow[1]*Rating/100)/4.5;
			//console.log("price: "+ pricerange + " rating: " + ratings);
			parts.push(pricerange + ratings + distancerange);
			itemsasArr.push(parts);
		}
		//console.log(itemsasArr[0][itemsasArr[0].length-1]);
		itemsasArr.sort(Comparator);
		//console.log(itemsasArr[0][itemsasArr[0].length-1]);
		update_maps(itemsasArr);

		//drawMarkers(markers);
	}
    