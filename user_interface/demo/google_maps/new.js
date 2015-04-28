
var markers = [];
var cur_pos;
var map;
var directionsService = new google.maps.DirectionsService();
var directionsDisplay;
var distance_cache = [];
var maxDist=0;
var curr_bounds="";
var zoomed = false;
var zoomed_marker;
var cur_loc_fixed = false;
var styles = [
    {
      stylers: [
        { hue: "#00ffe6" },
        { saturation: -20 }
      ]
    },{
      featureType: "road",
      elementType: "geometry",
      stylers: [
        { lightness: 100 },
        { visibility: "simplified" }
      ]
    },{
      featureType: "road",
      elementType: "labels",
      stylers: [
        { visibility: "off" }
      ]
    }
  ];
var styledMap = new google.maps.StyledMapType(styles,
    {name: "Styled Map"});


function initialize_map() {

	directionsDisplay = new google.maps.DirectionsRenderer();
	var mapOptions = {
		center: { lat: home.lat, lng: home.long},
		zoom: 13,
		panControl: false,    		
		scaleControl: true,
		mapTypeControlOptions: {
      		mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
    	}
	};
	map = new google.maps.Map(document.getElementById('map-canvas'),
		mapOptions);
	map.mapTypes.set('map_style', styledMap);
  	map.setMapTypeId('map_style');
	google.maps.event.addListener(map, 'click', handleClick);
	var trafficLayer = new google.maps.TrafficLayer();
  		//trafficLayer.setMap(map);
		//directionsDisplay.setMap(map);
		directionsDisplay.setOptions({
			'preserveViewport' : true,
			'suppressMarkers': true
		});
		drawCurLoc();
	}

	function handleClick(){
		if(zoomed == true){
			showAllMarkers();
			directionsDisplay.setMap(null);
			// zoomed_marker.infoWindow.close();
			zoomed = false;
			$("#keyword_space").empty();
		}else{
			//Do nothing
		}
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
				calculateDistances(temp);
				cur_loc_fixed = true;
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
				calculateDistances(temp);
				cur_loc_fixed = true;
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
			//kshf.dt.MainTable[i].data.push(distance);
			if(distance > maxDist)
				maxDist = distance;
			distance_cache[Number(kshf.dt.MainTable[i].data[0])] = Number(distance);
		}
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
		map.fitBounds(curr_bounds);
	}


	function addMarker(location) {
		var temp = new google.maps.LatLng(location.lat, location.longitude);
		var marker_str = "";
		if(location.marker == "default")
			marker_str = "google_maps/bdot.png";
		else
			marker_str = "google_maps/map_markers/"+location.marker;
		// var temp_infoWindow = new google.maps.InfoWindow({
		// 	content : location.tooltip
		// });
		var temp_marker = new google.maps.Marker({
			position: temp,
			map: map,
			animation: google.maps.Animation.DROP,
    		icon: marker_str,
    		'cur_pos': cur_pos,
    		// 'infoWindow': temp_infoWindow,
    		'keywords': location.keywords
    	});
  //   	google.maps.event.addListener(temp_infoWindow,'closeclick',function(){
  //  			handleClick();
		// });
    	var mouseMoved = false;
		google.maps.event.addListener(temp_marker, 'click', function(){
			var start = this.cur_pos.position;
			var end = this.position;
			zoomed_marker = this;
			// this.infoWindow.open(map,this);
			var request = {
				origin: new google.maps.LatLng(start.k, start.D),
				destination: new google.maps.LatLng(end.k, end.D),
				travelMode: google.maps.TravelMode.DRIVING
			};
			hideAllMarkersExcept(temp_marker, start, end);
			zoomed = true;
			directionsService.route(request, function(response, status) {
				if (status == google.maps.DirectionsStatus.OK) {
    				directionsDisplay.setMap(map);
    				directionsDisplay.setDirections(response);
    			}
    		});
    		$("#keyword_space").empty();
    		console.log("keywords:"+this.keywords);
    		$("#keyword_space").append(this.keywords);
    		//console.log("infoWindow:%o",this.infoWindow);
		});
		markers.push(temp_marker);
	}

	function clearMarkers(){
		for(var i=0; i<markers.length; i++){
			markers[i].setMap(null);
		}
		markers = [];
	}

	function hideAllMarkersExcept(marker, start, end){
		var temp_latlnglist = new Array();
		console.log("cur_pos:"+start.k+","+start.D);
		console.log("dest:"+end);
		temp_latlnglist.push(new google.maps.LatLng(start.k, start.D));
		temp_latlnglist.push(new google.maps.LatLng(end.k, end.D));
		for(var i=0; i<markers.length; i++){
			if(markers[i] == marker)
				continue;
			markers[i].setMap(null);
		}
		var temp_bounds = new google.maps.LatLngBounds();
    	for (var i = 0, LtLgLen = temp_latlnglist.length; i < LtLgLen; i++) {
  			//  And increase the bounds to take this point
  			temp_bounds.extend (temp_latlnglist[i]);
		}
		map.fitBounds(temp_bounds);
	}

	function showAllMarkers(){
		for(var i=0; i<markers.length; i++){
			markers[i].setMap(map);
		}
		map.fitBounds(curr_bounds);
	}

	function update_maps(dataItems){
    	//dataItems = dataItems.split("\n");
    	clearMarkers();
    	var pins = [];
    	var latlngList = new Array();
    	if(cur_pos != undefined && cur_pos.k != undefined && cur_pos.D != undefined)
    	 	latlngList.push(new google.maps.LatLng(cur_pos.k, cur_pos.D));
    	for(var i=0; i<25 && i<dataItems.length; i++){
    		var parts = dataItems[i];
    		var catid = parts[1];
    		var lat = parts[8];
    		var longitude = parts[9];
    		var ratings = parts[2];
    		var pricerange = parts[3];
    		var name = parts[11];
    		var max_score = parts[12];
    		var avg_score = parts[13];
    		var top_review = parts[14];
    		var temp_keywords = getImpKeywords(parts[15]);
    		var keywords_html="";
    		keywords_html = addKeywords(temp_keywords);
    		if(kshf.dt.Categories[catid] === undefined)
    			continue;
    		var catData = kshf.dt.Categories[catid].data;
    		var category = catData[1];
    		var tooltip = generateToolTipHtml(name, category, ratings, 
    			pricerange, max_score, avg_score, top_review);
    		//console.log("tooltip:"+tooltip);
    		var marker = catData[3];
    		//console.log("keywords:"+keywords_html);
    		if(lat != undefined && longitude != undefined)
    			latlngList.push(new google.maps.LatLng(lat,longitude));
    		if(i<=9){
    			pins.push({
    				"lat":lat,
    				"longitude":longitude,
    				"ratings":ratings,
    				"pricerange":pricerange,
    				"name":name,
    				"category":category,
    				"marker":marker,
    				"tooltip":tooltip,
    				"keywords":keywords_html
    			});
    		}else{
    			pins.push({
    				"lat":lat,
    				"longitude":longitude,
    				"ratings":ratings,
    				"pricerange":pricerange,
    				"name":name,
    				"category":category,
    				"marker":"default",
    				"tooltip":tooltip,
    				"keywords":keywords_html
    			});
    		}
    		curr_bounds = null;
    		curr_bounds = new google.maps.LatLngBounds();
    		for (var i = 0, LtLgLen = latlngList.length; i < LtLgLen; i++) {
  				//  And increase the bounds to take this point
  				curr_bounds.extend (latlngList[i]);
			}
    	}
    	drawMarkers(pins);
    	//addKeywords();
    }

    function addKeywords(keywords_list){
    	var html = "";
    	// var color = rgb(0,255,0);
    	for(var i=0; i< 20 && i<keywords_list.length; i++){
    		html += '<span style="margin-left:10px; border-radius:20px;" class="positive_keyword" >'+keywords_list[i].text+'</span>';
    	}
    	return html;
    }

    function Comparator(a,b){
    	if (a[a.length-1] > b[b.length-1]) return -1;
    	if (a[a.length-1] < b[b.length-1]) return 1;
    	return 0;
    }

    function update_maps_from_slider(dataItems, price, Distance, Rating){
    	if(cur_loc_fixed == false){
    		setTimeout(function(){
    			update_maps_from_slider(dataItems, price, Distance, Rating);
    		},100);
    		return;
    	}

    	dataItems = dataItems.split("\n");

		var itemsasArr = [];
		//TODO:: Change 99 and put data length..
		var max_d = 0;
		for(var i=0; i<dataItems.length-1; i++) {
			var parts = dataItems[i].split(",");
			var dist = distance_cache[Number(parts[0])]
			if(distance_cache[Number(parts[0])] > max_d)
				max_d = dist;
		}

		for(var i=0; i<dataItems.length-1; i++) {
			var keyword_json = dataItems[i].substring(dataItems[i].lastIndexOf("["), dataItems[i].length);
			if(keyword_json.charAt(keyword_json.length-1) != ']'){
				console.log("err:"+keyword_json);
			}
			var remaining = dataItems[i].substring(0,dataItems[i].lastIndexOf("[")-1);
			var parts = remaining.split(",");
			var top_review = parts.slice(14,parts.length).join(",");
			parts = parts.slice(0,14);
			parts.push(top_review);
			parts.push(keyword_json);
			try{
				var ratingrow = kshf.dt.Ratings[Number(parts[2])].data;
				var pricerow = kshf.dt.Price_Range[Number(parts[3])].data;
				var distancerow = distance_cache[Number(parts[0])];
			}
			catch(err){
				console.log(parts[0]+" "+parts[2]+" "+parts[3]);
			}
			var distancerange = distancerow/max_d * Distance/100;
			var pricerange = ((5-pricerow[1])*price/100)/4;
			var ratings = (ratingrow[1]*Rating/100)/4.5;
			parts.push((pricerange + ratings + distancerange));
			itemsasArr.push(parts);
		}
		itemsasArr.sort(Comparator);
		// for(var i=0; i<itemsasArr.length; i++){
		// 	var temp = itemsasArr[i][15];
		// 	if(temp.charAt(temp.length-1) != ']'){
		// 		console.log("err:"+temp);
		// 	}
		// }
		// console.log("itemsArr:%o",itemsasArr);
		update_maps(itemsasArr);
	}

	function  generateToolTipHtml(name, category, ratings,
    			pricerange, max_score, avg_score, top_review){
	var str ='<div id="tooltip">'+
		'<div class="titleheader">'+
			'<span class="title"><span>'+name+' '+'<span>'+
			'<span class="bus-type">'+category+'</span></span>'+
		'</div>'+
		'<div class="stats">'+
			'<span class="distance">3.4 mi</span>'+
			'<span class="duration">15 min.</span>'+
		'</div>'+
		'<div class="tooltipscores">'+
			'<div class="rating"><span>Rating:<span class="stars">4.5</span></span></div>'+
			'<div class="price"><span>Price:</span><span id="priceA">'+(pricerange+1)+'</span><span id=\'priceI\'></span></div>'+
			'<div class="senti-score"><span>Customer feedback: </span><span id=\'s-score\'>'+avg_score+'</span></div>'+
			'<textarea readonly disabled class="review">'+top_review+'</textarea>'+
		'</div>'+
		'</div>';
		return str;
	}