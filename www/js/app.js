$.support.cors = true;

var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

function escapeHtml(string) {
  return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
}

function getMinuteDiff(lastChange) {
	var d1 = Date.parse(lastChange);
	var d2 = Date.now();
	
	return Math.floor((d2 - d1) / 1000 / 60);
}

function getLastChangeColor(diff) {

	if (diff < 15)
		return "green";
		
	if (diff < 30)
		return "yellow";

	return "red";
}

function contactWorker() {
	$.ajax({
		url: 'http://' + gatewayAddress + '/api/window-contacts',
		crossDomain: true,
		dataType: "json",
		async: true,
		success: function (result) {
            contacts.parseJSON(result);
        },
        error: function (request,status,error) {
            alert(status + ' - ' + error);
        },
		complete: function() {
			// Schedule the next request when the current one's complete
			setTimeout(contactWorker, 3000);
    	}
	});
}

var contactResult = null;
var contactId = '';

function getContactLabelById(id) {
	var result = null;

	$.each(contactResult, function(i, row) {
		if (row.id == id)
			result = row.label;
	});
	
	return result;
}

var saveSettings = function() {
	var address = $('#gatewayAddress').val();
	localStorage.setItem('gatewayAddress', address);
	gatewayAddress = address;
	window.history.back();
};

$(document).on("ready", function(){
	$('#saveSettings').on('click', saveSettings);
	var gatewayAddressSetting = localStorage.getItem('gatewayAddress');
	if (gatewayAddressSetting) {
	    gatewayAddress = gatewayAddressSetting;
	}
	$('#gatewayAddress').val(gatewayAddress);

	$.ajax({
        url: 'http://' + gatewayAddress + '/api/device',
        crossDomain: true,
        dataType: "json",
        async: true,
        success: function (result) {
            gateways.parseJSON(result);
        },
        error: function (request,status,error) {
            alert(status + ' - ' + error);
        }
    });
    
    contactWorker();
});

$(document).on('click', '#saveLabel', function(){
	var label = $('#contactLabel').val();
	body = JSON.stringify({ 'label': label });
	$.ajax({
		type: "PUT",
		url: 'http://' + gatewayAddress + '/api/window-contacts/' + contactId,
		crossDomain: true,
		contentType: "application/json",
		data: body,
		dataType: "json",
		async: true, 
        error: function (request,status,error) {
            alert(status + ' - ' + error);
        }
	});
});

$(document).on('click', '#gateway-list li a', function(){  
    gatewayInfo.mac_address = $(this).attr('data-id');
    $.mobile.changePage( "#contacts", { transition: "slide", changeHash: true });
});

$(document).on('click', '#contact-list li a', function(){
    contactId = $(this).attr('data-id');
    $('#contactLabel').val(getContactLabelById(contactId));
	$.mobile.changePage( "#labelDialog", { transition: "pop" });
});

$(document).on('swipeleft', '#contact-list li a', function(event){
	$(this).hide();
	key = $(this).attr('data-id');
	body = JSON.stringify({ 'ids': [ key ] });
	$.ajax({
		type: "POST",
		url: 'http://' + gatewayAddress + '/api/blacklist',
		crossDomain: true,
		contentType: "application/json",
		data: body,
		dataType: "json",
		async: true, 
        error: function (request,status,error) {
            alert(status + ' - ' + error);
        }
	});
});

$(document).on('swipeleft', '#black-list li a', function(event){
	$(this).hide();
	key = $(this).attr('data-id');
	$.ajax({
		type: "DELETE",
		url: 'http://' + gatewayAddress + '/api/blacklist/' + key,
		crossDomain: true,
		async: true, 
        error: function (request,status,error) {
            alert(status + ' - ' + error);
        }
	});
});

$(document).on('swiperight', '#home', function(event){
	$.mobile.changePage( "#black", { transition: "slide", changeHash: true });
	$('.ui-page-active').css("background-color", "#e9e9e9");
});

$(document).on('swiperight', '#black', function(event){
	$.mobile.changePage( "#home", { transition: "slide", changeHash: true });
	$('.ui-page-active').css("background-color", "#ffffff");
});

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
    	var discovery = null;
    	
    	if (typeof ZeroConf != 'undefined') {
    		discovery = ZeroConf;
		} else if (typeof zeroconf != 'undefined') {
			discovery = zeroconf;
		} else if (typeof cordova != 'undefined') {
			discovery = cordova.plugins.zeroconf;
		} else {
			alert("zeroconf undefined");
			return;
		}
		
		discovery.watch('_enocean-gw._tcp', function(result) {
    		if (result.action == 'added') {
    			alert('service added' + JSON.stringify(result.service));
    		} else {
        		alert('service removed');
    		}
		});
    }
};

var gatewayAddress = "192.168.178.174";

var gatewayInfo = {
	mac_address : null,
	result : null
}

var contactInfo = {
    id : null,
    result : null
}

var gateways = {
	parseJSON:function(result){
		$('#gateway-list').empty();
		$('#gateway-list').append('<li data-role="list-divider">Found gateways</li>');
        $('#gateway-list').append('<li><a href="#gatewayPopMenu" data-rel="popup" data-transition="slideup" data-id="' +
        	escapeHtml(result.mac_address) + '"><h3>' + escapeHtml(result.label) + '</h3></li>');
        $('#gateway-list').listview().listview('refresh');
    }
}

function renderLists() {
	$('#contact-list').empty();
    $('#black-list').empty();
    $.each(contactResult, function(i, row) {
    	var minutes = getMinuteDiff(row.last_change);
    	var icon = getLastChangeColor(minutes) + 'dot';
    	var list = (row.is_blacklisted) ? '#black-list' : '#contact-list';
    	var state = (row.open) ? 'img/open_window.png' : 'img/closed_window.png';

    	$(list).append('<li data-icon="' + icon + '"><a href="" data-id="' + escapeHtml(row.id) + '"><img src="' + state + '" /><h1>' + escapeHtml(row.label) + '</h1></li>');
    });
    $('#contact-list').listview().listview('refresh');
    $('#black-list').listview().listview('refresh');
}

function addToBlacklist(id) {
	$.each(contactResult, function(i, row) {
		if (row.id == id)
			row.is_blacklisted = true;
	});
	renderLists();
}

function removeFromBlacklist(id) {
	$.each(contactResult, function(i, row) {
		if (row.id == id)
			row.is_blacklisted = false;
	});
	renderLists();
}

var contacts = {  
    parseJSON:function(result){
    	contactResult = result;
        renderLists();
    }
}
