.PHONY: help popup

help:
	@ echo "Available commands:"
	@ echo "  make help - show this message"
	@ echo "  make popup - build popup react project"
	@ echo "  make popup-clean - remove popup-dist directory"

popup:
	@ echo "Building popup react project..."
	cd popup && npm run build

popup-clean:
	rm -rf ./popup-dist/
