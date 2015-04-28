function getImpKeywords(dat){
	// console.log("dat:%o",dat);
	dat = JSON.parse(dat);
	// console.log("dat:%o",dat);
	len = dat.length;
	dat = removeUnnecessary(dat);
	// console.log("dat:%o",dat)

	function Comparator(a,b){
		if(parseFloat(a.sentiment.score) > parseFloat(b.sentiment.score)) return -1;
		if(parseFloat(a.sentiment.score) < parseFloat(b.sentiment.score)) return 1;
		return 0;
	}
	var result = new Array();
	dat.sort(Comparator);
	for(i = 0; i < dat.length; i++){
		var temp;
		temp = {'score' : dat[i].sentiment.score, 'text':dat[i].text};
		// temp.score = dat[i].sentiment.score;
		// temp.text = dat[i].text;
		result.push(temp);
	}
	// console.log("result:%o",result);
	return result;
}

function removeUnnecessary(a){
	var new_one = new Array();
	for(i = 0 ; i < a.length ; i++){
		if(a[i].sentiment != undefined && a[i].sentiment.score != undefined){
		//if (a[i].hasOwnProperty('sentiment') && a[i].sentiment.hasOwnProperty('score')){
 			new_one.push(a[i]);
 		}
 	}
 	//console.log("new_one:"+new_one);
 	return new_one;
}