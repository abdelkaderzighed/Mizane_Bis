with open('CoursSupremeViewer.jsx', 'r') as f:
    lines = f.readlines()

print(f"Total lignes: {len(lines)}")
print("\n=== Lignes 866-950 ===\n")

for i in range(865, min(950, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
