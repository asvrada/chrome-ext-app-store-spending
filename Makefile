.PHONY: help popup

help:
	@ echo "Available commands:"
	@ echo "  make help - show this message"
	@ echo "  make build - build whole extension"
	@ echo "  make popup - build popup"
	@ echo "  make popup-clean - remove popup-build directory"

popup:
	@ echo "Building popup react project..."
	cd popup && npm run build_prod

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
	# Move /popup
	mv ./popup-build ./build/popup-build