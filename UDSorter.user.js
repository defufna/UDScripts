// ==UserScript==
// @name		UD Item Combiner, Organizer and Sorter (forked and patched by Jack Taner)
// @description		Combines, organizes and sorts your inventory and calculates the number of shots you have in your weapons.
// @namespace		http://aichon.com
// @version			1.2.4
// @include		http://urbandead.com/map.cgi*
// @include		http://www.urbandead.com/map.cgi*
// @exclude		http://urbandead.com/map.cgi?logout
// @exclude		http://www.urbandead.com/map.cgi?logout
// ==/UserScript==

/* Urban Dead Item Combiner, Organizer and Sorter (forked and patched by Jack Tanner)
 * v1.2.4 (based on the original v1.2.2 script)
 *
 * Copyright (c) 2020 Jack Taner -- https://github.com/Shikada
 * Copyright (C) 2014 Bradley Sattem -- bsatsjunk+uduserscripts@gmail.com
 * Copyright (C) 2008 Ville Jokela -- midianian@mbnet.fi
 * Copyright (C) 2005 Ryan Forsythe -- ryan@pdxcb.net
 *
 * Released under the terms of the GNU GPL V2, which can be found at http://www.gnu.org/copyleft/gpl.html
 *
 * Changes:
 *   1.2.4
 *     * Click on a wasted item button now offers to drop item
 *	 1.2.3:
 *	   * added a Wasted section which shows items that waste your AP (these were hidden before), but buttons are disabled so you don't click on them by accident
 *   1.2.2:
 *     * added a "Special" section for items like the DSS Sat Phone that can't be altered in any way
 *   1.2.1:
 *     * made several items that waste AP when used cease showing up in the inventory
 *   1.2:
 *     * added NecroTech syringe to Science (a syringe is named like this if you lack NT skills)
 *     * unknown items should work properly now
 *   1.1:
 *     * items matched with regular expressions (most of the decorations) didn't work. now they do
 *   1.0:
 *     * complete rewrite to make compatible with Opera and Google Chrome
 *     * merged "Medical" category to "Science"
 *     * all carried radios are now shown entirely separately, so that each of their frequencies can be adjusted individually
 *     * syringes are no longer dumped to Unknown when the character doesn't know how to revive
 *     * christmas trees and lights added, though not tested
 *     * unrecognized items are preserved as they are, and not combined
 *     * "drop item" list is also sorted and duplicates removed
 *   0.5: (skips over that other dude's obfuscated 0.4)
 *     * new category: decorations
 *     * shows total shots for pistol clips, similar to pistols
 *     * alphabetically sorts items inside categories
 *     * inventory header now looks same as without the script (also in 0.4)
 *     * shows encumbrance percentage (also in 0.4)
 *     * added flavour-melee weapons (also in 0.4)
 *   0.3:
 *     * Added "kitchen knife" to weapons
 *     * Added "radio" to other items
 *     * Added "radio transmitter" to other items
 *     * Added "binoculars" to other items
 *     * Changed namespace
 *     * Fixed pattern matching bug, non ammo items with brackets(i.e. radio) should be displayed correctly now
 *   0.2:
 *     * Added "portable generator" to other items.
 *     * Added newline fix (thx Kieren and Joshua).
 *     * Removed some newlines, fixed the namespace.
*/

var weaponList = [
	'baseball bat',
	'cricket bat',
	'crowbar',
	'fencing foil',
	'fire axe',
	'flare gun',
	'golf club',
	'hockey stick',
	'length of pipe',
	'kitchen knife',
	'knife',
	'pistol',
	'pool cue',
	'shotgun',
	'ski pole',
	'tennis racket',
];

var ammoList = [
	'pistol clip',
	'shotgun shell',
];

var bevList = [
	'bottle of beer',
	'bottle of wine',
];

var sciList = [
	'DNA extractor',
	'first-aid kit',
	'NecroTech syringe',		// without skills
	'revivification syringe',	// with skills
];

var otherList = [
	'binoculars',
	'book',
	'crucifix',
	'flak jacket',
	'fuel can',
	'GPS unit',
	'mobile phone',
	'newspaper',
	'pair of wirecutters',
	'poetry book',
	'portable generator',
	'radio',
	'radio transmitter',
	'spray can',
	'toolbox',
	'stale candy',
];

var specialList = [
    'satellite phone'
];

var specialContainer = [];

var decoList = [
	'antique mirror',
	'blown-glass sculpture',
	'terracotta statue',
	'clay figurine',
	'skull',
];

var wastedClicks = [
	'fire axe',
	'flak jacket',
	'spray can',
	'toolbox',
];

var rexList = [
	{ rex: 'glass .*',	cat: 'Decorations'	},
	{ rex: '.* painting',	cat: 'Decorations'	},
	{ rex: '.* urn',	cat: 'Decorations'	},
	{ rex: '.* vase',	cat: 'Decorations'	},
	{ rex: '.* sculpture',	cat: 'Decorations'	},
	{ rex: '.* skeleton',	cat: 'Decorations'	},
	{ rex: 'stuffed .*',	cat: 'Decorations'	},
	{ rex: '.* tapestry',	cat: 'Decorations'	},
	{ rex: '.* lights',	cat: 'Decorations'	},
	{ rex: '.* tree',	cat: 'Decorations'	},
];

var categoryHash = {
	'Weapons':	weaponList,
	'Ammo':		ammoList,
	'Science':	sciList,
	'Beverages':	bevList,
    'Others':	otherList,
    'Wasted':       wastedClicks,
	'Decorations':	decoList,
};

// the order in which the categories are printed
var categoryList = [
	'Weapons',
	'Ammo',
	'Science',
	'Beverages',
	'Others',
    'Decorations',
    'Wasted',
	'Unknown',
];


// Unknown items are also uncombined
var uncombineList = {
	'radio': true,
};

var calcShotsList = {
	'pistol':	{ fromExtra: true },
	'shotgun':	{ fromExtra: true },
	'pistol clip':	{ multiplier: 6 },
};


function reorganizeInventory() {
	var preInventory = findPreInventory();
	if (!preInventory)	// no inventory
		return;
	var itemHash = processItems(preInventory.nextSibling);
	var categoryTable = categorizeItems(itemHash);
	var table = genTable(categoryTable);
	preInventory.parentNode.insertBefore(table, preInventory.nextSibling);
}

function findPreInventory() {
	var pgraphs = document.evaluate('//td[@class="gp"]/p', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

	for (var i = 0; i < pgraphs.snapshotLength; i++) {
		p = pgraphs.snapshotItem(i);
		if (p.firstChild)
			if (p.firstChild.textContent == 'Inventory (click to use):')
				return p.nextSibling;
	}

	return null;
}

function processItems(form) {
	var iHash = {}; // "itemname" -> { num: "n:o of occurences", command: "?command", extras: [ "<select>"/"<hidden radio stuff>"/"(ammo)" ] } associative array

	while (isItem(form)) {
		var input = form.firstChild;
		var itemName = input.value;

	    if(!isSpecialItem(itemName)) {
            var info = iHash[itemName];
            if (!info) {
                info = {};
                info.num = 0;
                var matches = form.action.match(/\?(.*)$/);
                if (matches)	// not sure if this is needed. all items appear to have a use-code
                    info.command = matches[1];
                info.extras = [];
            }
            info.num++;
            info.extras.push(getExtra(form));
            iHash[itemName] = info;

		}
        else
            specialContainer.push(form);

		var oldForm = form;
		form = form.nextSibling.nextSibling;	// skips over the '&nbsp;' between items
		form.parentNode.removeChild(oldForm);
	}

	pruneNulls(iHash);

	return iHash;
}

function isSpecialItem(itemName) {
	for(var i = 0; i < specialList.length; i++)
		if(itemName == specialList[i]) return true;
	return false;
}

function isWastedClick(itemName) {
	for(var i = 0; i < wastedClicks.length; i++)
		if(itemName == wastedClicks[i]) return true;
	return false;
}

function isItem(form) {
	if (form.nodeName == 'FORM')
		return true;

	return false;
}

function getExtra(form) {
	var frag = document.createDocumentFragment();

	for (var i = 1; i < form.childNodes.length; i++)
		frag.appendChild(form.childNodes[i].cloneNode(true));

	if (frag.childNodes.length)
		return frag;
	else
		return null;
}

function pruneNulls(iHash) {
	for (var item in iHash) {
		if (iHash[item].extras) {
			oldExtras = iHash[item].extras;
			newExtras = [];
			while (oldExtras.length) {
				var val = oldExtras.shift();
				if (val)
					newExtras.push(val);
			}
			if (newExtras.length)
				iHash[item].extras = newExtras;
			else
				iHash[item].extras = null;
		}
	}
}

function categorizeItems(itemHash) {
	var cHashHash = createCategoryHashHash();

	for (var item in itemHash)
		cHashHash[resolveCategory(item)][item] = itemHash[item];

	return cHashHash;
}

function createCategoryHashHash() {
	cHashHash = {};

	for (var i in categoryList)
		cHashHash[categoryList[i]] = {};

	return cHashHash;
}

function resolveCategory(item) {
	var i2cHash = createItemCategoryHash();

	var cat = i2cHash[item];
	if (cat)
		return cat;
	else
		for (var i = 0; i < rexList.length; i++) {
			rexItem = rexList[i];
			var matches = item.match(rexItem.rex);
			if (matches)
				return rexItem.cat;
		}

	// found neither in hash nor regexes, thus Unknown
	return 'Unknown';
}

function createItemCategoryHash() {
	var i2cHash = {};

	for (var catName in categoryHash) {
		itemList = categoryHash[catName];
		for (var i in itemList)
			i2cHash[itemList[i]] = catName;
	}

	return i2cHash;
}

function genTable(categoryTable) {
	var table = document.createElement('table');

	for (var i in categoryList) {
		var row = genRow(categoryTable[categoryList[i]], categoryList[i]);
		if (row)
			table.appendChild(row);
	}

	row = genSpecialRow("Special");
	if (row)
		table.appendChild(row);

	return table;
}

function genRow(cat, name) {
	var keys = getHashKeys(cat);
	if (!keys.length)
		return null;

    var isWasted = false;
    if (name === 'Wasted') {
        isWasted = true;
    }

	var row = document.createElement('tr');
	var title = document.createElement('td');
	title.style.borderBottom = '3px solid #676';
    if (isWasted) {
        title.style.color = 'red';
        title.style.borderBottom = '3px solid red';
    }

	var titletext = document.createTextNode(name);
	title.appendChild(titletext);
	row.appendChild(title);
	var content = document.createElement('td');

    content.style.borderBottom = '3px solid #676';

	keys.sort();

	for (var i in keys) {
		var item = keys[i];
		var add;

		if (uncombineList[item] || name == 'Unknown')
			add = uncombineItems(item, cat[item]);
		else
			add = genItem(item, cat[item], isWasted);

		content.appendChild(add);
		content.appendChild(document.createTextNode(' '));

        for(var j in specialContainer) {
            content.appendChild(specialContainer[j]);
            content.appendChild(document.createTextNode(' '));
        }
	}

	row.appendChild(content);

	return row;
}

function genSpecialRow(name) {
	if (!specialContainer.length)
		return null;

	var row = document.createElement('tr');
	var title = document.createElement('td');
	title.style.borderBottom = '3px solid #676';

	var titletext = document.createTextNode(name);
	title.appendChild(titletext);
	row.appendChild(title);
	var content = document.createElement('td');
	content.style.borderBottom = '3px solid #676';

    for(var j in specialContainer) {
		content.appendChild(specialContainer[j]);
        content.appendChild(document.createTextNode(' '));
	}
    row.appendChild(content);

	return row;
}

function dropItem(ev){
  let answer = window.confirm("Do you want to drop " + ev.target.value + "?");
  if(!answer){
    return
  }
  
  let items = document.querySelector("select[name='drop']");    
  for(let item of items.options){
    if(item.textContent.indexOf(ev.target.value) != -1){
      item.selected = true;
      break;
    }
  }
  items.parentNode.submit();
}

function genItem(name, info, isWasted) {
	var form = document.createElement('form');
	form.action = 'map.cgi?' + info.command;
	form.method = 'POST';
	form.className = 'a';

	if (info.num > 1)
		form.appendChild(document.createTextNode(info.num + ' \xD7 '));		// multiplication sign

	var button = document.createElement('input');
	button.setAttribute('class', 'm');
	button.setAttribute('type', 'submit');
	button.setAttribute('value', name);
  if (isWasted) {
    button.addEventListener("click", dropItem);
    button.type = "button";
  }

	form.appendChild(button);

	if (calcShotsList[name])
		form.appendChild(calcShots(info, calcShotsList[name]));
	else if (info.extras)
		form.appendChild(info.extras[0]);

	return form;
}

function calcShots(info, def) {
	var frag = document.createDocumentFragment();
	var shots = 0;

	if (def.fromExtra) {
		var gunRex = /\((.)\)/;
		var str = ' (';

		info.extras.sort(sortExtras);
		for (var i = 0; i < info.extras.length; i++) {
			var matches = info.extras[i].childNodes[0].textContent.match(gunRex);
			var n = 1 * matches[1];
			shots += n;
			str += n;
			if (i + 1 != info.extras.length)
				str += ', ';
		}
		str += ')';

		frag.appendChild(document.createTextNode(str));
	} else
		shots = def.multiplier * info.num;

	frag.appendChild(document.createTextNode(' \u2192 ' + shots));		// right arrow

	return frag;
}

function sortExtras(a, b) {
	if (a.textContent < b.textContent)
		return -1;
	else if (a.textContent == b.textContent)
		return 0;
	else
		return 1;
}

function uncombineItems(name, info) {
	var frag = document.createDocumentFragment();

	if (info.extras) {
		info.num = 1;
		for (var i = 0; i < info.extras.length; i++) {
			info.extras[0] = info.extras[i];
			var item = genItem(name, info);
			frag.appendChild(item);
			if (i != (info.extras.length - 1))
				frag.appendChild(document.createTextNode(' '));
		}
	} else {	// pruneNulls() may remove .extras from unknown items
		for (var i = 0; i < info.num; i++) {
			var item = genItem(name, info);
			frag.appendChild(item);
			if (i != (info.num - 1))
				frag.appendChild(document.createTextNode(' '));
		}
	}

	return frag;
}

function getHashKeys(hash) {
	var keys = [];
	for (var key in hash)
		keys.push(key);

	return keys;
}

function processDropList() {
	var dropList = document.evaluate('//select[@name="drop"]', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0);
	var dl = [];

	if(dropList != null) {
		for (var i = 0; i < dropList.childNodes.length; i++)
			dl.push(dropList.childNodes[i].cloneNode(true));

		while (dropList.hasChildNodes())
			dropList.removeChild(dropList.firstChild);

		var pruned = pruneDuplicates(dl.sort(sortOptions));

		for (var i in pruned)
			dropList.appendChild(pruned[i]);
	}
}

function sortOptions(a, b) {
	var r;
	var astr = a.firstChild.textContent;
	var bstr = b.firstChild.textContent;

	if (astr < bstr)
		r = -1;
	else if (astr == bstr)
		r = 0;
	else
		r = 1;

	return r;
}

function pruneDuplicates(dl) {
	var pruned = [ dl[0] ];

	for (var i = 1; i < dl.length; i++) {
		if (dl[i].value != pruned[pruned.length-1].value)
			pruned.push(dl[i]);
	}

	return pruned;
}

reorganizeInventory();
processDropList();
