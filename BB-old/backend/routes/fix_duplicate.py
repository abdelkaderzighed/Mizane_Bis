with open('routes_coursupreme_viewer.py', 'r') as f:
    lines = f.readlines()

new_lines = []
in_first_search = False
in_second_search = False
first_search_done = False

i = 0
while i < len(lines):
    line = lines[i]
    
    if 'def search_decisions():' in line:
        if not first_search_done:
            first_search_done = True
            in_first_search = True
            new_lines.append(line)
        else:
            while i < len(lines) and (lines[i].startswith(' ') or lines[i].startswith('\t') or lines[i].strip() == '' or 'def search_decisions' in lines[i]):
                i += 1
            i -= 1
    else:
        new_lines.append(line)
    
    i += 1

with open('routes_coursupreme_viewer.py', 'w') as f:
    f.writelines(new_lines)

print("Doublon supprime")
