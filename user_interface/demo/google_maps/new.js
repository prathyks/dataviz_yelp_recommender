	
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

    function drawMarkers(locations){
    	for(var i=0; i < locations.length; i++){
    		setTimeout(addMarker, (i+1) * 200, locations[i]);
    	}
    }

    function addMarker(location) {
    	var temp = new google.maps.LatLng(location.lat, location.longitude);
    	var temp_marker = new google.maps.Marker({
    		position: temp,
    		map: map,
    		animation: google.maps.Animation.DROP,
    		icon: 'google_maps/map_markers/'+location.marker,
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
    		directionsService.route(request, function(response, status) {
    			if (status == google.maps.DirectionsStatus.OK) {
    				// console.log("%o",response);
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

    function update_maps(dataItems){
    	//dataItems = dataItems.split("\n");
    	clearMarkers();
    	var markers = [];
    	//console.log("d:%o",kshf.dt.Categories[2].data);
    	for(var i=0; i<10; i++){
    		var parts = dataItems[i];
    		var catid = parts[1];
    		var lat = parts[8];
    		var longitude = parts[9];
    		var ratings = parts[2];
    		var pricerange = parts[3];
    		var name = parts[11];
    		//console.log("catid:"+catid);
    		if(kshf.dt.Categories[catid] === undefined)
    			continue;
    		var catData = kshf.dt.Categories[catid].data;
    		var category = catData[1];
    		var marker = catData[3];
    		//console.log(catData[1]);
    		markers.push({
    			"lat":lat,
    			"longitude":longitude,
    			"ratings":ratings,
    			"pricerange":pricerange,
    			"name":name,
    			"category":category,
    			"marker":marker
    			});
    		//console.log(i+":"+dataItems[i]);
    	}
    	drawMarkers(markers);
    }

	function Comparator(a,b){
		if (a[a.length-1] > b[b.length-1]) return -1;
		if (a[a.length-1] < b[b.length-1]) return 1;
		return 0;
	}

	function update_maps_from_slider(dataItems, price, Distance, Rating){
		dataItems = dataItems.split("\n");
		//clearMarkers();
		var markers = [];
		var itemsasArr = [];
		//console.log(price + " " + Rating);
		//console.log("d:%o",kshf.dt.Price_Range[1].data);
		//TODO:: Change 99 and put data length..
		for(var i=0; i<99; i++) {
			var parts = dataItems[i].split(",");
			//console.log("d:%o",Number(parts[2]));
			try{
				//console.log("d:%o",kshf.dt.Ratings[Number(parts[2])].data);
				var ratingrow = kshf.dt.Ratings[Number(parts[2])].data;
				var pricerow = kshf.dt.Price_Range[Number(parts[3])].data;
			}
			catch(err){
				console.log(parts[0]+" "+parts[2]+" "+parts[3])
			}


			var pricerange = ((5-pricerow[1])*price/100)/4;
			var ratings = (ratingrow[1]*Rating/100)/4.5;
			//console.log("price: "+ pricerange + " rating: " + ratings);
			parts.push(pricerange + ratings);
			itemsasArr.push(parts);
		}
		console.log(itemsasArr[0][itemsasArr[0].length-1]);
		itemsasArr.sort(Comparator);
		console.log(itemsasArr[0][itemsasArr[0].length-1]);
		update_maps(itemsasArr);

		//drawMarkers(markers);
	}
    