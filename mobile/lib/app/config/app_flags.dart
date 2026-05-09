class AppFlags {
  static const bool useMockData =
      bool.fromEnvironment('USE_MOCK', defaultValue: true);
}
