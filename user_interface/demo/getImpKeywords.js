//send the whole contents of the MainTable's Tag column as input. Processes the data for each row in the MainTable
function getImpKeywords(dat){
	len = dat.length

	removeUnnecessary(dat);
	
	function Comparator(a,b){
		if(a.sentiment.score > b.sentiment.score) return -1;
		if(a.sentiment.score < b.sentiment.score) return 1;
		return 0;
	}
	
	var score = [];
	var text = [];
	dat.sort(Comparator);
	for(i = 0; i < dat.length; i++){
		score[i] = dat[i].sentiment.score;
		text[i] = dat[i].text;
	}

	console.log("Sentiment Score :"+score);
	console.log("Keywords :"+text);
}

function removeUnnecessary(a){
	for(i = 0 ; i < len ; i++){
		if (!a[i].hasOwnProperty('sentiment').hasOwnProperty('score')){
 			len = len - 1;
 			console.log('reached here');
 			for(j = i ; j < len ; j++){
 				a[j] = a[j+1]
 			}
 		}
 	}
}