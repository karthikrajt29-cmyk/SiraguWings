import 'dart:convert';
import 'package:flutter/services.dart';
import '../model/nearby_center_model.dart';

class NearbyRepository {
  Future<List<NearbyCenter>> fetchNearbyCenters() async {
    final raw = await rootBundle.loadString('assets/mock/parent/nearby_centers.json');
    final list = jsonDecode(raw) as List<dynamic>;
    return list.map((e) => NearbyCenter.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ParentUpdate>> fetchUpdates() async {
    final raw = await rootBundle.loadString('assets/mock/parent/parent_updates.json');
    final list = jsonDecode(raw) as List<dynamic>;
    return list.map((e) => ParentUpdate.fromJson(e as Map<String, dynamic>)).toList();
  }
}
