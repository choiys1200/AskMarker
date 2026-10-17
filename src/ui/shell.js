'use strict';
const baseCSS = require('./base.css');
const panelCSS = require('./panel.css');
const template = require('./shell.html');
function mountShell(version) {
  const host = document.createElement('div');
  host.id = 'question-basket-extension';
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483646';
  const shadow = host.attachShadow({mode:'open'});
  shadow.innerHTML = '<style>' + baseCSS + panelCSS + '</style>' + template.replace('{{VERSION}}', version);
  document.documentElement.append(host);
  return {host, shadow, $: id => shadow.getElementById(id)};
}
module.exports = {mountShell, baseCSS};
