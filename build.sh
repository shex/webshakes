#!/bin/sh

# Set up variables
NAME=webshakes
VERSION=`grep "<em:version>" install.rdf | sed -r "s/^\s*<em:version>(.+)<\/em:version>\s*$/\\1/"`
BUILD=$VERSION
if [ "$1" != "-r" ]; then
	DATE=`date +"%Y%m%d"`
	BUILD="$BUILD.$DATE.${1-0}"
fi
XPI="$NAME-$BUILD.xpi"

# Copy base structure to a temporary build directory and change to it
echo "Creating working directory ..."
rm -rf build
mkdir build
cp -r chrome.manifest install.rdf LICENSE \
	defaults components chrome locale modules skin \
	build/
cd build

LOCALES=\"en-US\"

echo "Patching install.rdf version ..."
#sed "s!<em:version>.*</em:version>!<em:version>$BUILD</em:version>!" \
#  install.rdf > install.rdf.tmp
#mv install.rdf.tmp install.rdf

echo "Cleaning up unwanted files ..."
find . -depth -name '.svn' -exec rm -rf "{}" \;
find . -depth -name '*~' -exec rm -rf "{}" \;
find . -depth -name '#*' -exec rm -rf "{}" \;

echo "Creating $XPI ..."
zip -qr9X "../$XPI" *

echo "Cleaning up temporary files ..."
cd ..
#rm -rf build
