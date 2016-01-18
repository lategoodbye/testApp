$.support.cors = true;

var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };
  
var gatewayState = 0;

function hashCode(str) {
	var hash = 0, i, chr, len;
  
	if (str.length === 0)
		return hash;

	for (i = 0, len = str.length; i < len; i++) {
		chr = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
  	}
  	
  	return hash;
};

function setGatewayState(state) {
	if (state == gatewayState)
		return;

	switch(state) {
		case 0:
			$('#duckbill-state').attr('src', 'img/warning.png');
			break;
		case 1:
			$('#duckbill-state').attr('src', 'img/duckbill.gif');
			break;
		case 2:
			$('#duckbill-state').attr('src', 'img/duckbill.gif');
			break;
	}
	
	gatewayState = state;
}

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

	if (diff < 20)
		return "green";
		
	if (diff < 35)
		return "yellow";

	return "red";
}

function storeGatewayAddress(address) {
	if (!address)
		return;
		
	if (address == gatewayAddress)
		return;

	gatewayAddress = address;
	localStorage.setItem('gatewayAddress', address);
	$('#gatewayAddress').val(gatewayAddress);
	
	$.ajax({
        url: 'http://' + gatewayAddress + '/api/device',
        crossDomain: true,
        dataType: "json",
        async: true,
        success: function (result) {
            gateways.parseJSON(result);
            setGatewayState(2);
        },
        error: function (request,status,error) {
            setGatewayState(0);
        }
    });

    contactWorker();
}

function contactWorker() {
	if (!gatewayAddress) {
		setTimeout(contactWorker, 500);
		return;
	}

	$.ajax({
		url: 'http://' + gatewayAddress + '/api/window-contacts',
		crossDomain: true,
		dataType: "json",
		async: true,
		success: function (result) {
            contacts.parseJSON(result);
            setGatewayState(2);
        },
        error: function (request,status,error) {
            setGatewayState(0);
        },
		complete: function() {
			// Schedule the next request when the current one's complete
			setTimeout(contactWorker, 500);
    	}
	});
}

var contactResult = null;
var contactResultHash = 0;
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
	storeGatewayAddress(address);
	window.history.back();
};

$(document).on("ready", function(){
	$('#saveSettings').on('click', saveSettings);
	var gatewayAddressSetting = localStorage.getItem('gatewayAddress');
	if (gatewayAddressSetting) {
	    // gatewayAddress = gatewayAddressSetting;
	}
});

$(document).on('click', '#saveLabel', function(){
	var label = $('#contactLabel').val();

	if (label.length == 0)
		return false;

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
            setGatewayState(0);
        }
	});
});

$(document).on('click', '#gateway-list li a', function(){  
    gatewayInfo.mac_address = $(this).attr('data-id');
    $.mobile.changePage( "#contacts", { transition: "slide", changeHash: true });
});

$(document).on('taphold', '#contact-list li a', function(){
    contactId = $(this).attr('data-id');
    $('#contactId').html(contactId);
    $('#contactLabel').val(getContactLabelById(contactId));
	$.mobile.changePage( "#labelDialog", { transition: "pop" });
});

$(document).on('pageshow', '#labelDialog', function(){
	$('#contactLabel').click(function(e){ $(this).focus(); });
	$('#contactLabel').trigger('click');
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
            setGatewayState(0);
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
            setGatewayState(0);
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
    		// alert("ZeroConf");
		} else if (typeof zeroconf != 'undefined') {
			discovery = zeroconf;
			// alert("zeroconf");
		} else if ((typeof cordova != 'undefined') &&
				   (typeof cordova.plugins != 'undefined') &&
				   (typeof cordova.plugins.zeroconf != 'undefined')) {
			discovery = cordova.plugins.zeroconf;
			// alert("cordova.plugins.zeroconf");
		} else {
			alert("No zeroconf plugin found");
			return;
		}
		
		discovery.watch('_enocean-gw._tcp.local.', function(result) {
    		if (result.action == 'added') {
    			if (result.service.application &&
    				result.service.addresses) {
    				storeGatewayAddress(result.service.addresses[0]);
    			}
    		} else {
        		alert('Enocean gateway removed');
    		}
		});
    }
};

// var gatewayAddress = "192.168.178.174";

var gatewayAddress = null;

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
    	var hash = hashCode(JSON.stringify(result));
    	
    	if (hash != contactResultHash) {
    		contactResult = result;
    		contactResultHash = hash;
        	renderLists();
        }
    }
}
