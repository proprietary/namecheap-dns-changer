#!/bin/env bash

# assumes the following variables are set:
# NAMECHEAP_USERNAME is used by the node.js script; this is your namecheap.com login username
# NAMECHEAP_PASSWORD is used by the node.js script; this is your namecheap.com login password (remember to escape properly)
# NAMECHEAP_DOMAIN is the root domain name, e.g., example.com
# NAMECHEAP_HOST is the host of the A record ("subdomain"); e.g., for my.example.com, "my" should be the value of this var
# NAMECHEAP_DDNS_PASSWORD is a token you get from namecheap's Advanced DNS dashboard by switching on "ddns"

function get_ip() {
	dig +short myip.opendns.com @resolver1.opendns.com
}

function get_host_ip() {
	dig +short $NAMECHEAP_HOST.$NAMECHEAP_DOMAIN | head -n 1
}

dir_of_this_script="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" # WARNING: if this script is called a symlink, this won't work

host_ip=$(get_host_ip)

while true
do
	my_ip=$(get_ip)
	if [ $host_ip != $my_ip ]
	then
		echo IP: $my_ip, host IP: $host_ip
		node $dir_of_this_script/index.js --domain=$NAMECHEAP_DOMAIN --ddns-host=$NAMECHEAP_HOST --ddns-password=$NAMECHEAP_DDNS_PASSWORD --to=$my_ip
		host_ip=$(get_host_ip)
	fi
	sleep 60
done
