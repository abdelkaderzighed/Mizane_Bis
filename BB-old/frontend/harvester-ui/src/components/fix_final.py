with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Remplacer la fin
old_end = """      )}
  );
};

export default CoursSupremeViewer;"""

new_end = """      )}
      </div>
    </div>
  );
};

export default CoursSupremeViewer;"""

content = content.replace(old_end, new_end)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Fermeture corrigee")
