.PHONY: help popup

help:
	@ echo "Available commands:"
	@ echo "  make help - show this message"
	@ echo "  make popup - build popup react project"

popup:
	@ echo "Building popup react project..."
	@ cd popup && npm run build

popup-clean:
	rm -rf ./popup-dist/
