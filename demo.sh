#!/bin/bash
function next() {
    while true; do
        read cmd
        if [[ $cmd == "n" ]]; then
            return 0
        fi
    done
}

echo "(press 'n' to go to next step)"
echo "1. performing homing..."
curl -X POST http://localhost:8080/homing
next
echo "2. moving to [150, -33.55, 55]"
curl -H "Content-Type: application/json" -d "{ \"x\": 150, \"y\": -33.55, \"z\": 55 }" http://localhost:8080/move
next
echo "3. grasping object (air pump open)"
curl -X POST http://localhost:8080/grasp
next
echo "4. releasing object (air pump close)"
curl -X POST http://localhost:8080/release