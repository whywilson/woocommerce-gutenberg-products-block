#!/bin/bash

for file in build/*.asset.php; do
	echo "$file:"
	echo
	cat $file
	echo
	echo
done
