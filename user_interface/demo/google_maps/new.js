var markers = [];
var cur_pos;
var map;
var directionsService = new google.maps.DirectionsService();
var directionsDisplay;
var distance_cache = [];
var maxDist = 0;
var curr_bounds = new google.maps.LatLngBounds();
var zoomed = false;
var zoomed_marker;
var cur_loc_fixed = false;
var home = {'lat' :33.428437, 'long': -111.947480};
// var styles = [{"featureType":"all","elementType":"labels.text.fill","stylers":[{"color":"#ffffff"}]},{"featureType":"all","elementType":"labels.text.stroke","stylers":[{"color":"#000000"},{"lightness":13}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#000000"}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#144b53"},{"lightness":14},{"weight":1.4}]},{"featureType":"landscape","elementType":"all","stylers":[{"color":"#08304b"}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#0c4152"},{"lightness":5}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#000000"}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#0b434f"},{"lightness":25}]},{"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"color":"#000000"}]},{"featureType":"road.arterial","elementType":"geometry.stroke","stylers":[{"color":"#0b3d51"},{"lightness":16}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#000000"}]},{"featureType":"transit","elementType":"all","stylers":[{"color":"#146474"}]},{"featureType":"water","elementType":"all","stylers":[{"color":"#021019"}]}];
//var styles = [{"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"color":"#444444"}]},{"featureType":"administrative.country","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"administrative.province","elementType":"all","stylers":[{"visibility":"on"}]},{"featureType":"administrative.province","elementType":"geometry","stylers":[{"visibility":"on"}]},{"featureType":"administrative.province","elementType":"geometry.fill","stylers":[{"color":"#fb9026"},{"visibility":"on"}]},{"featureType":"administrative.province","elementType":"geometry.stroke","stylers":[{"visibility":"on"},{"color":"#fb9026"},{"weight":"1.5"}]},{"featureType":"administrative.province","elementType":"labels.text.fill","stylers":[{"visibility":"on"},{"color":"#2b6a8b"}]},{"featureType":"administrative.province","elementType":"labels.text.stroke","stylers":[{"visibility":"on"}]},{"featureType":"administrative.locality","elementType":"all","stylers":[{"visibility":"on"}]},{"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#676767"}]},{"featureType":"landscape","elementType":"all","stylers":[{"color":"#bada90"}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"visibility":"on"}]},{"featureType":"landscape.man_made","elementType":"all","stylers":[{"visibility":"on"}]},{"featureType":"landscape.natural","elementType":"all","stylers":[{"visibility":"on"},{"color":"#d3e7f8"}]},{"featureType":"landscape.natural.landcover","elementType":"all","stylers":[{"visibility":"off"},{"color":"#6f3030"}]},{"featureType":"landscape.natural.terrain","elementType":"all","stylers":[{"visibility":"off"},{"color":"#ffffff"}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"all","stylers":[{"saturation":-100},{"lightness":45},{"visibility":"off"}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road.highway","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"road.highway.controlled_access","elementType":"all","stylers":[{"visibility":"on"}]},{"featureType":"road.highway.controlled_access","elementType":"labels","stylers":[{"visibility":"on"},{"hue":"#ff0000"}]},{"featureType":"road.arterial","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road.arterial","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"all","stylers":[{"color":"#46bcec"},{"visibility":"off"}]}];
// var styles = [{"featureType":"all","elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#000000"},{"lightness":40}]},{"featureType":"all","elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#000000"},{"lightness":16}]},{"featureType":"all","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":17},{"weight":1.2}]},{"featureType":"administrative.country","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"administrative.province","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":21}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":16}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":19}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":17}]},{"featureType":"water","elementType":"labels","stylers":[{"visibility":"off"}]}];
// var styles = [{"featureType":"all","elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#000000"},{"lightness":40}]},{"featureType":"all","elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#000000"},{"lightness":16}]},{"featureType":"all","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":17},{"weight":1.2}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":21}]},{"featureType":"poi.park","elementType":"all","stylers":[{"visibility":"on"}]},{"featureType":"poi.park","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#2c483d"}]},{"featureType":"poi.park","elementType":"geometry.stroke","stylers":[{"visibility":"off"}]},{"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"visibility":"on"},{"color":"#3c7d4c"}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":16}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"on"}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":19}]},{"featureType":"transit","elementType":"labels.text.fill","stylers":[{"visibility":"on"},{"color":"#ffffff"}]},{"featureType":"transit.line","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#00f1ff"}]},{"featureType":"transit.station.rail","elementType":"all","stylers":[{"visibility":"on"},{"hue":"#ff1f00"}]},{"featureType":"water","elementType":"geometry","stylers":[{"visibility":"on"},{"color":"#142427"},{"lightness":17}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"visibility":"on"},{"color":"#31aab0"}]}]
var styles = [{"stylers":[{"hue":"#ff1a00"},{"invert_lightness":true},{"saturation":-100},{"lightness":33},{"gamma":0.5}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#2D333C"}]}];
var styledMap = new google.maps.StyledMapType(styles, {
	name: "Styled Map"
});
var base_green = [41, 130, 23];
var base_red = [138, 15, 15];


function initialize_map() {

	directionsDisplay = new google.maps.DirectionsRenderer();
	var mapOptions = {
		center: {
			lat: home.lat,
			lng: home.long
		},
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
		'preserveViewport': true,
		'suppressMarkers': true
	});
	drawCurLoc();
}

function handleClick() {
	if (zoomed == true) {
		showAllMarkers();
		directionsDisplay.setMap(null);
		// zoomed_marker.infoWindow.close();
		zoomed = false;
		$("#keyword_space").empty();
		$("#info_space").empty();
	} else {
		//Do nothing
	}
}

function drawCurLoc() {
	var temp;
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			temp = new google.maps.LatLng(position.coords.latitude,
				position.coords.longitude);
			cur_pos = new google.maps.Marker({
				position: temp,
				map: map,
				icon: 'google_maps/cur_loc.png'
			});
			calculateDistances(temp);
			cur_loc_fixed = true;
			//drawMarkers();
		}, function() {
			console.log("Geo location service failed, defaulting back to hardcoded current pos");
			temp = new google.maps.LatLng(home.lat,
				home.long);
			cur_pos = new google.maps.Marker({
				position: temp,
				map: map,
				icon: 'google_maps/cur_loc.png'
			});
			calculateDistances(temp);
			cur_loc_fixed = true;
			//drawMarkers();
		});
	} else {
		alert("Your browser does not support geolocation");
	}
}

function calculateDistances(current_pos) {

	var cur_long = current_pos.lng();
	var cur_lat = current_pos.lat();
	// console.log("calcDist cur_lat:"+cur_lat);
	// console.log("cur_long:"+cur_long);

	for (var i = 0; i < kshf.dt.MainTable.length; i++) {
		var lat = kshf.dt.MainTable[i].data[8];
		var longitude = kshf.dt.MainTable[i].data[9];
		var distance = getDistanceFromLatLonInKm(cur_lat, cur_long, lat, longitude);
		//console.log("distance:"+distance);
		//kshf.dt.MainTable[i].data.push(distance);
		if (distance > maxDist)
			maxDist = distance;
		distance_cache[Number(kshf.dt.MainTable[i].data[0])] = Number(distance);
	}
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
	var R = 6371; // Radius of the earth in km
	var dLat = deg2rad(lat2 - lat1); // deg2rad below
	var dLon = deg2rad(lon2 - lon1);
	var a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c; // Distance in km
	return d;
}

function deg2rad(deg) {
	return deg * (Math.PI / 180)
}

function drawMarkers(locations) {
	for (var i = 0; i < locations.length; i++) {
		setTimeout(addMarker, (i + 1) * 30, locations[i]);
	}
	map.fitBounds(curr_bounds);
}


function addMarker(location) {
	var temp = new google.maps.LatLng(location.lat, location.longitude);
	var marker_str = "";
	if (location.marker == "default")
		marker_str = "google_maps/bdot.png";
	else
		marker_str = "google_maps/map_markers/new_markers/" + location.marker;
	// var temp_infoWindow = new google.maps.InfoWindow({
	// 	content : location.tooltip
	// });
	var temp_marker = new google.maps.Marker({
		position: temp,
		map: map,
		animation: google.maps.Animation.DROP,
		icon: marker_str,
		'cur_pos': cur_pos,
		'infoText': location.infoText,
		'keywords': location.keywords
	});
	//   	google.maps.event.addListener(temp_infoWindow,'closeclick',function(){
	//  			handleClick();
	// });
	var mouseMoved = false;
	google.maps.event.addListener(temp_marker, 'click', function() {
		var start = this.cur_pos.getPosition();
		var end = this.getPosition();
		// console.log("start:"+start.lat()+","+start.lng());
		// console.log("end:"+end.lat()+","+end.lng());
		zoomed_marker = this;
		// this.infoWindow.open(map,this);
		$("#info_space").empty();
		$("#info_space").append(this.infoText);

		var request = {
			origin: new google.maps.LatLng(start.lat(), start.lng()),
			destination: new google.maps.LatLng(end.lat(), end.lng()),
			travelMode: google.maps.TravelMode.DRIVING
		};
		hideAllMarkersExcept(temp_marker, start, end);
		zoomed = true;
		var distance_info;
		directionsService.route(request, function(response, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				directionsDisplay.setMap(map);
				directionsDisplay.setDirections(response);
			}
			distance_info = get_distance_info(response);
			fillInfoBox(distance_info);
		});
		$("#keyword_space").empty();
		// console.log("keywords:"+this.keywords);
		$("#keyword_space").append(this.keywords);
		//console.log("infoWindow:%o",this.infoWindow);
	});
	markers.push(temp_marker);
}

function get_distance_info(data) {
	var distance = [];
	distance.push(data.routes[0].legs[0].distance);
	distance.push(data.routes[0].legs[0].duration);
	return distance;
}

function clearMarkers() {
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(null);
	}
	markers = [];
}

function hideAllMarkersExcept(marker, start, end) {
	var temp_latlnglist = new Array();
	// console.log("hideallmarkersfunc cur_pos:" + start.lat() + "," + start.lng());
	// console.log("dest:" + end.lat()+","+end.lng());
	temp_latlnglist.push(new google.maps.LatLng(start.lat(), start.lng()));
	temp_latlnglist.push(new google.maps.LatLng(end.lat(), end.lng()));
	for (var i = 0; i < markers.length; i++) {
		if (markers[i] == marker)
			continue;
		markers[i].setMap(null);
	}
	var temp_bounds = new google.maps.LatLngBounds();
	for (var i = 0, LtLgLen = temp_latlnglist.length; i < LtLgLen; i++) {
		//  And increase the bounds to take this point
		temp_bounds.extend(temp_latlnglist[i]);
	}
	map.fitBounds(temp_bounds);
}

function showAllMarkers() {
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(map);
	}
	map.fitBounds(curr_bounds);
}

function update_maps(dataItems) {
	//dataItems = dataItems.split("\n");
	clearMarkers();
	var pins = [];
	var latlngList = new Array();
	if (cur_pos != undefined && cur_pos.getPosition().lat() != undefined && cur_pos.getPosition().lng() != undefined)
		latlngList.push(cur_pos.getPosition());
	// console.log("cur_pos lat:"+cur_pos.getPosition().lat());
	// console.log("cur_pos long:"+cur_pos.getPosition().lng());
	for (var i = 0; i < 25 && i < dataItems.length; i++) {
		var parts = dataItems[i];
		var catid = parts[1];
		var lat = parts[8];
		var longitude = parts[9];
		var ratings = kshf.dt.Ratings[parts[2]].data[1];
		var pricerange = kshf.dt.Price_Range[parts[3]].data[1];
		var name = parts[11];
		var max_score = parts[12];
		var avg_score = parts[13];
		var top_review = parts[14];
		var temp_keywords = getImpKeywords(parts[15]);
		var keywords_html = "";
		keywords_html = addKeywords(temp_keywords);
		// if (kshf.dt.Categories[catid] === undefined)
		// 	continue;
		var catData = kshf.dt.Categories[catid].data;
		var category = catData[1];
		var infoText = generateToolTipHtml(name, category, ratings,
			pricerange, max_score, avg_score, top_review);
		if (lat != undefined && longitude != undefined)
			latlngList.push(new google.maps.LatLng(lat, longitude));
		if(i == 0){
			var distance = [];
			distance.push({'text': "7.9 mi"});
			distance.push({'text': "12 minutes"});
			$("#info_space").append(infoText);
			$("#keyword_space").append(keywords_html);
			fillInfoBox(distance);
		}
		if (i < 10) {
			var marker = catData[3] + (i + 1) + ".png";
			pins.push({
				"lat": lat,
				"longitude": longitude,
				"ratings": ratings,
				"pricerange": pricerange,
				"name": name,
				"category": category,
				"marker": marker,
				"infoText": infoText,
				"keywords": keywords_html
			});
		} else {
			pins.push({
				"lat": lat,
				"longitude": longitude,
				"ratings": ratings,
				"pricerange": pricerange,
				"name": name,
				"category": category,
				"marker": "default",
				"infoText": infoText,
				"keywords": keywords_html
			});
		}
	}
	curr_bounds=null;
	curr_bounds = new google.maps.LatLngBounds();
	for (var j = 0; j < latlngList.length; j++) {
		//  And increase the bounds to take this point
		curr_bounds.extend(latlngList[j]);
	}
	drawMarkers(pins);
	//addKeywords();
}

function addKeywords(keywords_list) {
	var html = "";
	var pos_keywords = keywords_list.slice(0, Math.floor(keywords_list.length / 2));
	var neg_keywords = keywords_list.slice(Math.floor(keywords_list.length / 2), keywords_list.length);
	// positive keywords
	for (var i = 0; i < 5 && i < pos_keywords.length; i++) {
		var color = getNextGreen(base_green, i);
		html += '<span style="margin-left:10px; border-radius:20px; background-color: rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ');"' + ' class="positive_keyword" >' + pos_keywords[i].text + '</span>';
	}
	//negative keywords
	for (var i = 0; i < 5 && i < neg_keywords.length; i++) {
		var color = getNextRed(base_red, i);
		var ind = neg_keywords.length - 1 - i;
		html += '<span style="margin-left:10px; border-radius:20px; background-color: rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ');"' + ' class="positive_keyword" >' + neg_keywords[ind].text + '</span>';
	}
	return html;
}

function getNextGreen(base, i) {
	var new_color = [];
	new_color.push(base[0] + ((i + 1) * 32));
	new_color.push(base[1] + ((i + 1) * 16));
	new_color.push(base[2] + ((i + 1) * 32));
	return new_color;
}

function getNextRed(base, i) {
	var new_color = [];
	new_color.push(base[0] + ((i + 1) * 16));
	new_color.push(base[1] + ((i + 1) * 32));
	new_color.push(base[2] + ((i + 1) * 32));
	return new_color;
}

function Comparator(a, b) {
	if (a[a.length - 1] > b[b.length - 1]) return -1;
	if (a[a.length - 1] < b[b.length - 1]) return 1;
	return 0;
}

function update_maps_from_slider(dataItems, price, Distance, Rating) {
	if (cur_loc_fixed == false) {
		setTimeout(function() {
			update_maps_from_slider(dataItems, price, Distance, Rating);
		}, 100);
		return;
	}
	handleClick();
	$("#keyword_space").empty();
	$("#info_space").empty();
	dataItems = dataItems.split("\n");

	var itemsasArr = [];
	//TODO:: Change 99 and put data length..
	var max_d = 0;
	for (var i = 0; i < dataItems.length - 1; i++) {
		var parts = dataItems[i].split(",");
		var dist = distance_cache[Number(parts[0])]
		if (distance_cache[Number(parts[0])] > max_d)
			max_d = dist;
	}

	for (var i = 0; i < dataItems.length - 1; i++) {
		var keyword_json = dataItems[i].substring(dataItems[i].lastIndexOf("["), dataItems[i].length);
		if (keyword_json.charAt(keyword_json.length - 1) != ']') {
			console.log("err:" + keyword_json);
		}
		var remaining = dataItems[i].substring(0, dataItems[i].lastIndexOf("[") - 1);
		var parts = remaining.split(",");
		var top_review = parts.slice(14, parts.length).join(",");
		parts = parts.slice(0, 14);
		parts.push(top_review);
		parts.push(keyword_json);
		try {
			var ratingrow = kshf.dt.Ratings[Number(parts[2])].data;
			var pricerow = kshf.dt.Price_Range[Number(parts[3])].data;
			var distancerow = distance_cache[Number(parts[0])];
		} catch (err) {
			console.log(parts[0] + " " + parts[2] + " " + parts[3]);
		}
		var distancerange = (1 - (distancerow / max_d)) * Distance / 100;
		var pricerange = ((5 - pricerow[1]) * price / 100) / 4;
		var ratings = (ratingrow[1] * Rating / 100) / 4.5;
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

function generateToolTipHtml(name, category, ratings,
	pricerange, max_score, avg_score, top_review) {
	var str = '<div id="tooltip">' +
		'<div class="titleheader">' +
		'<span class="title"><span>' + name + ' ' + '<span><br/>' +
		'<span class="bus-type">' + category + '</span></span><br/>' +
		'</div>' +
		'<div class="stats infoItem" >' +
		'Distance : <span id="route_dist"></span> <br/>' +
		'Duration : <span id="route_duration"></span><br/>' +
		'</div>' +
		'<div class="tooltipscores">' +
		'<div class="rating infoItem"><span>Rating:<span class="stars">' + ratings + '</span></span></div>' +
		'<div class="price infoItem"><span>Price:</span><span id="priceA">' + pricerange + '</span><span id=\'priceI\'></span></div>' +
		'<div class="senti-score infoItem"><span>Customer feedback: </span><span id=\'s-score\'>' + avg_score + '</span></div>' +
		'<div class="infoItem">Top review: </div>' +
		'<div class="review_box">' + top_review + '</div>' +
		'</div>' +
		'</div>';
	return str;
}

function fillInfoBox(distance_info) {
	var price = document.getElementById('priceA').innerHTML;
	// console.log(price);
	var strA = '';
	var strI = '';
	for (i = 0; i < 4; i++) {
		if (i < parseInt(price))
			strA += '$';
		else
			strI += '$';
	}
	document.getElementById('priceA').innerHTML = strA;
	document.getElementById('priceI').innerHTML = strI;
	$("#route_dist").append(distance_info[0].text);
	$("#route_duration").append(distance_info[1].text);

	var svg = d3.select(".senti-score").append("svg")
		.attr("x", "500")
		.attr("y", "500")
		.attr("width", "100")
		.attr("height", "10");

	var rect = svg.append("rect")
		.attr("width", "100")
		.attr("height", "10")
		.style("fill", "white")
		.style("stroke", "black");
	var s = document.getElementById('s-score').innerHTML;
	document.getElementById('s-score').innerHTML = '';
	var rect1 = svg.append("rect")
		.attr("width", parseFloat(s) * 100)
		.attr("height", "20")
		.style("fill", "green")
		.style("opacity", function() {
			if (parseFloat(s) < 0.5) return 0.5;
			else return parseFloat(s);
		})
		.style("stroke", "black");

	$.fn.stars = function() {
		// console.log("inside stars:");
		return $(this).each(function() {
			val = Math.round(val * 2) / 2;
			var val = parseFloat($(this).html());
			var size = Math.max(0, (Math.min(5, val))) * 16;
			var $span = $('<span />').width(size);
			$(this).html($span);
		});
	}

	$(function() {
		$('span.stars').stars();
	});
}