.PHONY: help popup

help:
	@ echo "Available commands:"
	@ echo "  make help - show this message"
	@ echo "  make popup - build popup react project"
	@ echo "  make popup-clean - remove popup-build directory"

popup:
	@ echo "Building popup react project..."
	cd popup && npm run build

popup-clean:
	rm -rf ./popup-build/

build: popup
	@ echo "Cleanup previous build"
	rm -rf build/
	@ echo "Relase build..."
	mkdir -p ./build
	# Copy /
	cp ./manifest.json ./build/
	cp -r ./images ./build/
	# Copy ./scripts
	cp -r ./scripts ./build/
	# Copy /popup
	cp -r ./popup-build ./build/
	# Delete uncessary files
	rm ./build/popup-build/asset-manifest.json
	rm ./build/popup-build/static/js/*.map
	rm ./build/popup-build/static/css/*.map