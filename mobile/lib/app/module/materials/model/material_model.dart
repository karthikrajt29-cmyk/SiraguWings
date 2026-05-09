class CourseMaterial {
  final String id;
  final String title;
  final String description;
  final String batchId;
  final String batchName;
  final String type; // 'pdf', 'note', 'assignment'
  final String? fileName;
  final String uploadedBy;
  final DateTime uploadedAt;
  final String? dueDate;

  const CourseMaterial({
    required this.id,
    required this.title,
    required this.description,
    required this.batchId,
    required this.batchName,
    required this.type,
    this.fileName,
    required this.uploadedBy,
    required this.uploadedAt,
    this.dueDate,
  });

  factory CourseMaterial.fromJson(Map<String, dynamic> j) => CourseMaterial(
        id: j['id'] as String,
        title: j['title'] as String,
        description: j['description'] as String,
        batchId: j['batch_id'] as String,
        batchName: j['batch_name'] as String,
        type: j['type'] as String,
        fileName: j['file_name'] as String?,
        uploadedBy: j['uploaded_by'] as String,
        uploadedAt: DateTime.parse(j['uploaded_at'] as String),
        dueDate: j['due_date'] as String?,
      );
}
