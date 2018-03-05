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
	dig +short $NAMECHEAP_HOST.$NAMECHEAP_DOMAIN
}

while true
do
	host_ip=$(get_host_ip)
	my_ip=$(get_ip)
	if [ $host_ip != $my_ip ]
	then
		node index.js --domain=$NAMECHEAP_DOMAIN --ddns-host=$NAMECHEAP_HOST --ddns-password=$NAMECHEAP_DDNS_PASSWORD --to=$my_ip
	fi
	sleep 60
done
